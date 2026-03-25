import express, { type Request, type Response } from 'express';
import { store } from '../store';
import { createId } from '../utils/id';
import {
  normalizeCsvSource,
  normalizeImageSource,
  normalizeTextSource,
  normalizeUrlSource,
} from '../services/normalizers';
import type { Analysis, Ingestion, IngestionType, Project, Report } from '../types';

type IngestionBody = {
  type?: IngestionType;
  url?: string;
  title?: string;
  text?: string;
  sourceName?: string;
  imageName?: string;
  imageUrl?: string;
  rows?: unknown[];
  csvText?: string;
};

function createTimestamp() {
  return new Date().toISOString();
}

export function createApiRouter() {
  const router = express.Router();

  router.get('/projects', (_req, res) => {
    res.json({ data: store.listProjects() });
  });

  router.post('/projects', (req: Request, res: Response) => {
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
    };

    store.addProject(project);
    return res.status(201).json({ data: project });
  });

  router.get('/projects/:projectId', (req, res) => {
    const project = store.getProject(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    return res.json({ data: project });
  });

  router.post('/projects/:projectId/ingestions', (req, res) => {
    const project = store.getProject(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const ingestion = createIngestion(req.params.projectId, req.body as IngestionBody);
    store.addIngestion(ingestion);
    return res.status(201).json({ data: ingestion });
  });

  router.get('/projects/:projectId/ingestions', (req, res) => {
    const project = store.getProject(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    return res.json({ data: store.listIngestions(req.params.projectId) });
  });

  router.post('/projects/:projectId/analyses', (req, res) => {
    const project = store.getProject(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const analysis: Analysis = {
      id: createId('ana'),
      projectId: req.params.projectId,
      status: 'queued',
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

    store.addAnalysis(analysis);
    setImmediate(() => runAnalysisPipeline(analysis.id));
    return res.status(202).json({ data: analysis });
  });

  router.get('/projects/:projectId/analyses', (req, res) => {
    const project = store.getProject(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    return res.json({ data: store.listAnalyses(req.params.projectId) });
  });

  router.get('/analyses/:analysisId', (req, res) => {
    const analysis = store.getAnalysis(req.params.analysisId);
    if (!analysis) return res.status(404).json({ error: 'Analysis not found.' });
    return res.json({ data: analysis });
  });

  router.get('/projects/:projectId/reports', (req, res) => {
    const project = store.getProject(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    return res.json({ data: store.listReports(req.params.projectId) });
  });

  router.post('/projects/:projectId/reports', (req, res) => {
    const project = store.getProject(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const report: Report = {
      id: createId('rep'),
      projectId: req.params.projectId,
      analysisId: typeof req.body?.analysisId === 'string' ? req.body.analysisId : null,
      status: 'generated',
      summary: typeof req.body?.summary === 'string' ? req.body.summary : 'Report generated from available analysis data.',
      pdfUrl: `/api/v1/reports/placeholder/download`,
      createdAt: createTimestamp(),
    };

    store.addReport(report);
    return res.status(201).json({ data: report });
  });

  router.get('/reports/:reportId', (req, res) => {
    const report = store.getReport(req.params.reportId);
    if (!report) return res.status(404).json({ error: 'Report not found.' });
    return res.json({ data: report });
  });

  router.get('/reports/:reportId/download', (req, res) => {
    const report = store.getReport(req.params.reportId);
    if (!report) return res.status(404).json({ error: 'Report not found.' });
    return res.type('text/plain').send(`PDF export placeholder for report ${report.id}`);
  });

  return router;
}

function createIngestion(projectId: string, payload: IngestionBody): Ingestion {
  const type = payload.type;
  if (!type) {
    return {
      id: createId('ing'),
      projectId,
      status: 'failed',
      error: 'Ingestion type is required.',
      createdAt: createTimestamp(),
    };
  }

  const sourceHandlers = {
    url: () => normalizeUrlSource(payload),
    text: () => normalizeTextSource(payload),
    image: () => normalizeImageSource(payload),
    csv: () => normalizeCsvSource(payload),
  } as const;

  const normalized = sourceHandlers[type] ? sourceHandlers[type]() : null;
  if (!normalized) {
    return {
      id: createId('ing'),
      projectId,
      status: 'failed',
      error: `Unsupported ingestion type: ${type}`,
      createdAt: createTimestamp(),
    };
  }

  return {
    id: createId('ing'),
    projectId,
    type,
    status: 'completed',
    normalized,
    createdAt: createTimestamp(),
  };
}

function runAnalysisPipeline(analysisId: string) {
  const analysis = store.getAnalysis(analysisId);
  if (!analysis) return;

  try {
    analysis.status = 'running';
    analysis.updatedAt = createTimestamp();
    analysis.stages.insightExtraction = 'running';

    analysis.result = {
      insights: {
        painPoints: ['Placeholder pain point'],
        angles: ['Placeholder angle'],
        objections: ['Placeholder objection'],
      },
      performance: {
        summary: 'Placeholder performance analysis.',
      },
      creative: {
        hooks: ['Placeholder hook'],
        designCritique: ['Placeholder critique'],
      },
    };

    analysis.stages.insightExtraction = 'completed';
    analysis.stages.performanceAnalysis = 'completed';
    analysis.stages.creativeAnalysis = 'completed';
    analysis.status = 'completed';
    analysis.updatedAt = createTimestamp();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown analysis error.';
    analysis.status = 'failed';
    analysis.error = message;
    analysis.updatedAt = createTimestamp();
  }
}

