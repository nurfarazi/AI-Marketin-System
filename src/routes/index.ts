import express, { type Request, type Response } from 'express';
import { createId } from '../utils/id';
import { generateCreativeConcepts } from '../services/creative-generator';
import {
  normalizeCsvSource,
  normalizeImageSource,
  normalizeTextSource,
  normalizeUrlSource,
} from '../services/normalizers';
import { generateReportNarrative } from '../services/report-generator';
import { runFullPipeline, type NormalizedInput, type PipelineOutput } from '../services/pipeline';
import type {
  Analysis,
  Creative,
  Ingestion,
  IngestionPayload,
  IngestionType,
  Job,
  JobKind,
  JobStatus,
  NormalizedSource,
  Project,
  Report,
} from '../types';

type IngestionBody = {
  type?: IngestionType;
  payload?: IngestionPayload;
};

export type Repositories = {
  projects: {
    create: (project: Project) => Promise<Project>;
    list: () => Promise<Project[]>;
    getById: (id: string) => Promise<Project | null>;
  };
  ingestions: {
    create: (ingestion: Ingestion) => Promise<Ingestion>;
    listByProject: (projectId: string) => Promise<Ingestion[]>;
    getById: (id: string) => Promise<Ingestion | null>;
  };
  normalizedSources: {
    create: (source: NormalizedSource) => Promise<NormalizedSource>;
    listByProject: (projectId: string) => Promise<NormalizedSource[]>;
    getById: (id: string) => Promise<NormalizedSource | null>;
  };
  analyses: {
    create: (analysis: Analysis) => Promise<Analysis>;
    listByProject: (projectId: string) => Promise<Analysis[]>;
    getById: (id: string) => Promise<Analysis | null>;
    update: (id: string, update: Partial<Analysis>) => Promise<void>;
  };
  creatives: {
    create: (creative: Creative) => Promise<Creative>;
    listByProject: (projectId: string) => Promise<Creative[]>;
    getById: (id: string) => Promise<Creative | null>;
    update: (id: string, update: Partial<Creative>) => Promise<void>;
  };
  reports: {
    create: (report: Report) => Promise<Report>;
    listByProject: (projectId: string) => Promise<Report[]>;
    getById: (id: string) => Promise<Report | null>;
    update: (id: string, update: Partial<Report>) => Promise<void>;
  };
  jobs: {
    create: (job: Job) => Promise<Job>;
    listByProject: (projectId: string) => Promise<Job[]>;
    getById: (id: string) => Promise<Job | null>;
    update: (id: string, update: Partial<Job>) => Promise<void>;
  };
};

function createTimestamp() {
  return new Date().toISOString();
}

function getRouteParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function handleRepositoryError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : 'Database unavailable.';
  const isMongo =
    error instanceof Error && (error.name?.toLowerCase().includes('mongo') || message.toLowerCase().includes('mongo'));
  return res.status(isMongo ? 503 : 500).json({
    error: isMongo ? `Database unavailable: ${message}` : message,
  });
}

function safe(
  handler: (req: Request, res: Response) => Promise<unknown>,
) {
  return (req: Request, res: Response) => {
    handler(req, res).catch((error) => handleRepositoryError(res, error));
  };
}

function createJob(kind: JobKind, projectId: string, input?: Record<string, unknown>): Job {
  const now = createTimestamp();
  return {
    id: createId('job'),
    projectId,
    kind,
    status: 'queued',
    retries: 0,
    maxRetries: 2,
    input,
    createdAt: now,
    updatedAt: now,
  };
}

async function startJob(repositories: Repositories, job: Job) {
  job.status = 'running';
  job.startedAt = createTimestamp();
  job.updatedAt = createTimestamp();
  await repositories.jobs.update(job.id, {
    status: job.status,
    startedAt: job.startedAt,
    updatedAt: job.updatedAt,
  });
}

async function completeJob(
  repositories: Repositories,
  job: Job,
  status: JobStatus,
  output?: Record<string, unknown>,
  error?: string,
) {
  job.status = status;
  job.completedAt = createTimestamp();
  job.updatedAt = createTimestamp();
  if (output) job.output = output;
  if (error) job.error = error;
  await repositories.jobs.update(job.id, {
    status: job.status,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    updatedAt: job.updatedAt,
    output: job.output,
    error: job.error,
  });
}

export function createApiRouter(repositories: Repositories) {
  const {
    projects,
    ingestions,
    normalizedSources,
    analyses,
    creatives,
    reports,
    jobs,
  } = repositories;
  const router = express.Router();

  router.get('/projects', safe(async (_req, res) => {
    res.json({ data: await projects.list() });
  }));

  router.post('/projects', safe(async (req: Request, res: Response) => {
    const { name, clientName, objective } = req.body as Partial<Project>;
    if (!name) {
      return res.status(400).json({ error: 'Project name is required.' });
    }

    const project: Project = {
      id: createId('proj'),
      name,
      clientName: clientName || null,
      objective: objective || null,
      createdAt: createTimestamp(),
      updatedAt: createTimestamp(),
    };

    await projects.create(project);
    return res.status(201).json({ data: project });
  }));

  router.get('/projects/:projectId', safe(async (req, res) => {
    const projectId = getRouteParam(req.params.projectId);
    const project = await projects.getById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    return res.json({ data: project });
  }));

  router.post('/projects/:projectId/ingestions', safe(async (req, res) => {
    const projectId = getRouteParam(req.params.projectId);
    const project = await projects.getById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const payload = req.body as IngestionBody;
    if (!payload?.type) {
      return res.status(400).json({ error: 'Ingestion type is required.' });
    }
    if (!payload?.payload) {
      return res.status(400).json({ error: 'Ingestion payload is required.' });
    }

    const ingestion: Ingestion = {
      id: createId('ing'),
      projectId,
      type: payload.type,
      status: 'received',
      payload: payload.payload,
      createdAt: createTimestamp(),
      updatedAt: createTimestamp(),
    };

    await ingestions.create(ingestion);
    return res.status(201).json({ data: ingestion });
  }));

  router.get('/projects/:projectId/ingestions', safe(async (req, res) => {
    const projectId = getRouteParam(req.params.projectId);
    const project = await projects.getById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    return res.json({ data: await ingestions.listByProject(projectId) });
  }));

  router.post('/projects/:projectId/normalizations', safe(async (req, res) => {
    const projectId = getRouteParam(req.params.projectId);
    const project = await projects.getById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const ingestionIds = Array.isArray(req.body?.ingestionIds)
      ? req.body.ingestionIds.filter((id: unknown) => typeof id === 'string')
      : null;

    const ingestionsList = ingestionIds
      ? await Promise.all(ingestionIds.map((id: string) => ingestions.getById(id)))
      : await ingestions.listByProject(projectId);
    const ingestionsToNormalize = ingestionsList.filter(Boolean) as Ingestion[];

    if (!ingestionsToNormalize.length) {
      return res.status(400).json({ error: 'No ingestions available for normalization.' });
    }

    const job = createJob('normalization', projectId, {
      ingestionIds: ingestionsToNormalize.map((ing) => ing.id),
    });
    await jobs.create(job);
    await startJob(repositories, job);

    const normalizedSourcesList: NormalizedSource[] = [];
    for (const ingestion of ingestionsToNormalize) {
      const normalized = normalizeIngestion(ingestion);
      if (!normalized) {
        const failed: NormalizedSource = {
          id: createId('norm'),
          projectId: ingestion.projectId,
          ingestionId: ingestion.id,
          status: 'failed',
          error: 'Unsupported ingestion payload for normalization.',
          createdAt: createTimestamp(),
          updatedAt: createTimestamp(),
        };
        await normalizedSources.create(failed);
        normalizedSourcesList.push(failed);
        continue;
      }

      const source: NormalizedSource = {
        id: createId('norm'),
        projectId: ingestion.projectId,
        ingestionId: ingestion.id,
        status: 'completed',
        data: normalized,
        createdAt: createTimestamp(),
        updatedAt: createTimestamp(),
      };
      await normalizedSources.create(source);
      normalizedSourcesList.push(source);
    }

    const allCompleted = normalizedSourcesList.every((item) => item.status === 'completed');
    await completeJob(
      repositories,
      job,
      allCompleted ? 'completed' : 'failed',
      { normalizedIds: normalizedSourcesList.map((item) => item.id) },
      allCompleted ? undefined : 'One or more normalizations failed.',
    );

    return res.status(202).json({ data: { job, normalizedSources: normalizedSourcesList } });
  }));

  router.get('/projects/:projectId/normalizations', safe(async (req, res) => {
    const projectId = getRouteParam(req.params.projectId);
    const project = await projects.getById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    return res.json({ data: await normalizedSources.listByProject(projectId) });
  }));

  router.post('/projects/:projectId/analyses', safe(async (req, res) => {
    const projectId = getRouteParam(req.params.projectId);
    const project = await projects.getById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const normalizedIds = Array.isArray(req.body?.normalizedIds)
      ? req.body.normalizedIds.filter((id: unknown) => typeof id === 'string')
      : (await normalizedSources.listByProject(projectId)).map((item) => item.id);

    if (!normalizedIds.length) {
      return res.status(400).json({ error: 'No normalized sources available for analysis.' });
    }

    const job = createJob('analysis', projectId, { normalizedIds });
    await jobs.create(job);

    const analysis: Analysis = {
      id: createId('ana'),
      projectId,
      jobId: job.id,
      status: 'queued',
      inputNormalizedIds: normalizedIds,
      stages: {
        insightExtraction: 'pending',
        performanceAnalysis: 'pending',
        creativeAnalysis: 'pending',
      },
      result: null,
      retries: 0,
      createdAt: createTimestamp(),
      updatedAt: createTimestamp(),
    };

    await analyses.create(analysis);
    setImmediate(() => runAnalysisPipeline(repositories, analysis.id, job.id));
    return res.status(202).json({ data: { analysis, job } });
  }));

  router.get('/projects/:projectId/analyses', safe(async (req, res) => {
    const projectId = getRouteParam(req.params.projectId);
    const project = await projects.getById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    return res.json({ data: await analyses.listByProject(projectId) });
  }));

  router.get('/analyses/:analysisId', safe(async (req, res) => {
    const analysisId = getRouteParam(req.params.analysisId);
    const analysis = await analyses.getById(analysisId);
    if (!analysis) return res.status(404).json({ error: 'Analysis not found.' });
    return res.json({ data: analysis });
  }));

  router.post('/projects/:projectId/creatives', safe(async (req, res) => {
    const projectId = getRouteParam(req.params.projectId);
    const project = await projects.getById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const analysisId = typeof req.body?.analysisId === 'string' ? req.body.analysisId : undefined;
    const job = createJob('creative', projectId, { analysisId });
    await jobs.create(job);

    const creative: Creative = {
      id: createId('cre'),
      projectId,
      jobId: job.id,
      status: 'queued',
      analysisId,
      output: null,
      retries: 0,
      createdAt: createTimestamp(),
      updatedAt: createTimestamp(),
    };

    await creatives.create(creative);
    setImmediate(() => runCreativePipeline(repositories, creative.id, job.id));
    return res.status(202).json({ data: { creative, job } });
  }));

  router.get('/projects/:projectId/creatives', safe(async (req, res) => {
    const projectId = getRouteParam(req.params.projectId);
    const project = await projects.getById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    return res.json({ data: await creatives.listByProject(projectId) });
  }));

  router.get('/creatives/:creativeId', safe(async (req, res) => {
    const creativeId = getRouteParam(req.params.creativeId);
    const creative = await creatives.getById(creativeId);
    if (!creative) return res.status(404).json({ error: 'Creative not found.' });
    return res.json({ data: creative });
  }));

  router.get('/projects/:projectId/reports', safe(async (req, res) => {
    const projectId = getRouteParam(req.params.projectId);
    const project = await projects.getById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    return res.json({ data: await reports.listByProject(projectId) });
  }));

  router.post('/projects/:projectId/reports', safe(async (req, res) => {
    const projectId = getRouteParam(req.params.projectId);
    const project = await projects.getById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const analysisId = typeof req.body?.analysisId === 'string' ? req.body.analysisId : null;
    const creativeId = typeof req.body?.creativeId === 'string' ? req.body.creativeId : null;
    const job = createJob('report', projectId, { analysisId, creativeId });
    await jobs.create(job);

    const report: Report = {
      id: createId('rep'),
      projectId,
      jobId: job.id,
      analysisId,
      creativeId,
      status: 'queued',
      summary: typeof req.body?.summary === 'string' ? req.body.summary : 'Report queued for generation.',
      pdfUrl: null,
      createdAt: createTimestamp(),
      updatedAt: createTimestamp(),
    };

    await reports.create(report);
    setImmediate(() => runReportPipeline(repositories, report.id, job.id));
    return res.status(202).json({ data: { report, job } });
  }));

  router.get('/reports/:reportId', safe(async (req, res) => {
    const reportId = getRouteParam(req.params.reportId);
    const report = await reports.getById(reportId);
    if (!report) return res.status(404).json({ error: 'Report not found.' });
    return res.json({ data: report });
  }));

  router.get('/reports/:reportId/download', safe(async (req, res) => {
    const reportId = getRouteParam(req.params.reportId);
    const report = await reports.getById(reportId);
    if (!report) return res.status(404).json({ error: 'Report not found.' });
    if (!report.pdfUrl) return res.status(409).json({ error: 'Report is not ready for download.' });
    return res.type('text/plain').send(`PDF export placeholder for report ${report.id}`);
  }));

  router.get('/projects/:projectId/jobs', safe(async (req, res) => {
    const projectId = getRouteParam(req.params.projectId);
    const project = await projects.getById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    return res.json({ data: await jobs.listByProject(projectId) });
  }));

  router.get('/jobs/:jobId', safe(async (req, res) => {
    const jobId = getRouteParam(req.params.jobId);
    const job = await jobs.getById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    return res.json({ data: job });
  }));

  return router;
}

function normalizeIngestion(ingestion: Ingestion) {
  const payload = ingestion.payload ?? {};
  const sourceHandlers = {
    url: () => normalizeUrlSource(payload),
    text: () => normalizeTextSource(payload),
    image: () => normalizeImageSource(payload),
    csv: () => normalizeCsvSource(payload),
  } as const;

  return sourceHandlers[ingestion.type] ? sourceHandlers[ingestion.type]() : null;
}

function normalizedSourceToInput(source: NormalizedSource): NormalizedInput {
  const data = source.data as Record<string, unknown> | undefined;
  const content =
    typeof data?.extractedText === 'string'
      ? data.extractedText
      : typeof data?.text === 'string'
        ? data.text
        : JSON.stringify(data ?? {});

  return {
    kind: typeof data?.kind === 'string' ? data.kind : 'normalized',
    content,
    meta: {
      sourceId: source.id,
      ingestionId: source.ingestionId,
    },
  };
}

async function runAnalysisPipeline(repositories: Repositories, analysisId: string, jobId: string) {
  const analysis = await repositories.analyses.getById(analysisId);
  const job = await repositories.jobs.getById(jobId);
  if (!analysis || !job) return;

  try {
    await startJob(repositories, job);
    analysis.status = 'running';
    analysis.updatedAt = createTimestamp();
    analysis.stages.insightExtraction = 'running';
    await repositories.analyses.update(analysis.id, {
      status: analysis.status,
      updatedAt: analysis.updatedAt,
      stages: analysis.stages,
    });

    const normalizedSources = (await Promise.all(
      analysis.inputNormalizedIds.map((id) => repositories.normalizedSources.getById(id)),
    )).filter(Boolean) as NormalizedSource[];

    const pipelineOutput = await runFullPipeline(normalizedSources.map(normalizedSourceToInput));
    analysis.result = pipelineOutput;

    analysis.stages.insightExtraction = 'completed';
    analysis.stages.performanceAnalysis = 'completed';
    analysis.stages.creativeAnalysis = 'completed';
    analysis.status = 'completed';
    analysis.updatedAt = createTimestamp();
    await repositories.analyses.update(analysis.id, {
      status: analysis.status,
      updatedAt: analysis.updatedAt,
      stages: analysis.stages,
      result: analysis.result,
    });
    await completeJob(repositories, job, 'completed', { analysisId: analysis.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown analysis error.';
    analysis.status = 'failed';
    analysis.error = message;
    analysis.updatedAt = createTimestamp();
    await repositories.analyses.update(analysis.id, {
      status: analysis.status,
      updatedAt: analysis.updatedAt,
      error: analysis.error,
    });
    await completeJob(repositories, job, 'failed', { analysisId: analysis.id }, message);
  }
}

async function runCreativePipeline(repositories: Repositories, creativeId: string, jobId: string) {
  const creative = await repositories.creatives.getById(creativeId);
  const job = await repositories.jobs.getById(jobId);
  if (!creative || !job) return;

  try {
    await startJob(repositories, job);
    creative.status = 'running';
    creative.updatedAt = createTimestamp();
    await repositories.creatives.update(creative.id, {
      status: creative.status,
      updatedAt: creative.updatedAt,
    });
    const analysis = creative.analysisId ? await repositories.analyses.getById(creative.analysisId) : undefined;
    const pipeline = analysis?.result as PipelineOutput | null;
    const insights = pipeline?.insights || { painPoints: [], angles: [], objections: [] };
    creative.output = await generateCreativeConcepts({
      product: (await repositories.projects.getById(creative.projectId))?.name || 'Unknown product',
      insights,
    });
    creative.status = 'completed';
    creative.updatedAt = createTimestamp();
    await repositories.creatives.update(creative.id, {
      status: creative.status,
      updatedAt: creative.updatedAt,
      output: creative.output,
    });
    await completeJob(repositories, job, 'completed', { creativeId: creative.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown creative error.';
    creative.status = 'failed';
    creative.error = message;
    creative.updatedAt = createTimestamp();
    await repositories.creatives.update(creative.id, {
      status: creative.status,
      updatedAt: creative.updatedAt,
      error: creative.error,
    });
    await completeJob(repositories, job, 'failed', { creativeId: creative.id }, message);
  }
}

async function runReportPipeline(repositories: Repositories, reportId: string, jobId: string) {
  const report = await repositories.reports.getById(reportId);
  const job = await repositories.jobs.getById(jobId);
  if (!report || !job) return;

  try {
    await startJob(repositories, job);
    report.status = 'running';
    report.updatedAt = createTimestamp();
    await repositories.reports.update(report.id, {
      status: report.status,
      updatedAt: report.updatedAt,
    });
    const analysis = report.analysisId ? await repositories.analyses.getById(report.analysisId) : undefined;
    const pipeline = analysis?.result as PipelineOutput | null;
    if (!pipeline) {
      throw new Error('A completed analysis is required before report generation.');
    }

    report.summary = await generateReportNarrative({
      projectName: (await repositories.projects.getById(report.projectId))?.name || 'Unknown project',
      objective: (await repositories.projects.getById(report.projectId))?.objective || null,
      pipeline,
    });
    report.pdfUrl = `/api/v1/reports/${report.id}/download`;
    report.status = 'completed';
    report.updatedAt = createTimestamp();
    await repositories.reports.update(report.id, {
      status: report.status,
      updatedAt: report.updatedAt,
      summary: report.summary,
      pdfUrl: report.pdfUrl,
    });
    await completeJob(repositories, job, 'completed', { reportId: report.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown report error.';
    report.status = 'failed';
    report.error = message;
    report.updatedAt = createTimestamp();
    await repositories.reports.update(report.id, {
      status: report.status,
      updatedAt: report.updatedAt,
      error: report.error,
    });
    await completeJob(repositories, job, 'failed', { reportId: report.id }, message);
  }
}
