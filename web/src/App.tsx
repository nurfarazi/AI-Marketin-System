import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError, createApiClient } from './api';
import type {
  Analysis,
  Creative,
  DashboardBundle,
  Ingestion,
  IngestionPayload,
  IngestionType,
  Job,
  NormalizedSource,
  Project,
  Report,
} from './types';

type Notice = {
  tone: 'success' | 'error' | 'info';
  title: string;
  message: string;
};

type ProjectForm = {
  name: string;
  clientName: string;
  objective: string;
};

type SourceDraft = {
  sourceName: string;
  url: string;
  title: string;
  text: string;
  imageName: string;
  imageUrl: string;
  csvText: string;
  rowsJson: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://127.0.0.1:5011';
const STORAGE_KEYS = {
  activeProjectId: 'ai-marketing-web-active-project-id',
};

const EMPTY_BUNDLE: DashboardBundle = {
  project: null,
  ingestions: [],
  normalizedSources: [],
  analyses: [],
  creatives: [],
  reports: [],
  jobs: [],
};

const INITIAL_SOURCE_DRAFT: SourceDraft = {
  sourceName: 'Product feedback deck',
  url: 'https://example.com/product',
  title: 'Homepage',
  text: 'Customers want faster setup, clearer pricing, and fewer manual steps.',
  imageName: 'Ad creative 01',
  imageUrl: 'https://example.com/ad-creative.png',
  csvText: 'ad_name,impressions,clicks,spend\nLaunch 01,12000,340,580',
  rowsJson: '',
};

const SOURCE_OPTIONS: Array<{ type: IngestionType; label: string; hint: string }> = [
  { type: 'text', label: 'Text / review note', hint: 'Paste customer feedback, notes, or forum excerpts.' },
  { type: 'url', label: 'URL / product page', hint: 'Capture a product or landing page URL.' },
  { type: 'image', label: 'Image / screenshot', hint: 'Track creative name and a hosted image URL.' },
  { type: 'csv', label: 'CSV / ad export', hint: 'Paste CSV text or JSON rows for Meta export data.' },
];

function readLocalStorage(key: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  return window.localStorage.getItem(key) || fallback;
}

function saveLocalStorage(key: string, value: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function formatTime(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function statusTone(status?: string) {
  if (!status) return 'tone-neutral';
  if (status === 'completed' || status === 'received') return 'tone-success';
  if (status === 'running' || status === 'queued') return 'tone-warm';
  if (status === 'failed') return 'tone-danger';
  return 'tone-neutral';
}

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function summarizeAnalysis(result: unknown) {
  if (!isRecord(result)) return 'Analysis completed.';
  const insights = isRecord(result.insights) ? result.insights : null;
  const performance = isRecord(result.performance) ? result.performance : null;
  const painPoints = Array.isArray(insights?.painPoints) ? (insights?.painPoints as string[]) : [];
  const angles = Array.isArray(insights?.angles) ? (insights?.angles as string[]) : [];
  const summary = typeof performance?.summary === 'string' ? performance.summary : 'Pipeline analysis is ready.';

  return [summary, painPoints[0], angles[0]].filter(Boolean).join(' · ');
}

function summarizeCreative(output: unknown) {
  if (!isRecord(output)) return 'Creative concepts are ready.';
  const concepts = Array.isArray(output.concepts) ? output.concepts : [];
  const firstConcept = concepts[0];
  if (isRecord(firstConcept)) {
    const title = typeof firstConcept.title === 'string' ? firstConcept.title : '';
    const hook = typeof firstConcept.hook === 'string' ? firstConcept.hook : '';
    return [title, hook].filter(Boolean).join(' · ');
  }
  return 'Creative concepts are ready.';
}

function summarizeReport(summary: string) {
  return summary || 'The report is ready to download.';
}

function buildIngestionPayload(type: IngestionType, draft: SourceDraft): IngestionPayload {
  switch (type) {
    case 'url':
      return {
        sourceName: draft.sourceName || undefined,
        url: draft.url || undefined,
        title: draft.title || undefined,
      };
    case 'text':
      return {
        sourceName: draft.sourceName || undefined,
        text: draft.text || undefined,
      };
    case 'image':
      return {
        imageName: draft.imageName || undefined,
        imageUrl: draft.imageUrl || undefined,
      };
    case 'csv': {
      const payload: IngestionPayload = {
        sourceName: draft.sourceName || undefined,
        csvText: draft.csvText || undefined,
      };

      if (draft.rowsJson.trim()) {
        payload.rows = JSON.parse(draft.rowsJson) as unknown[];
      }

      return payload;
    }
    default:
      return {};
  }
}

function latest<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).at(-1) ?? null;
}

function Panel({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={classNames('panel', className)}>
      <div className="panel__header">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
          {description ? <p className="panel__description">{description}</p> : null}
        </div>
        {action ? <div className="panel__action">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={classNames('pill', tone)}>{children}</span>;
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  return <pre className="json-block">{JSON.stringify(value, null, 2)}</pre>;
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState(() =>
    readLocalStorage(STORAGE_KEYS.activeProjectId, ''),
  );
  const [bundle, setBundle] = useState<DashboardBundle>(EMPTY_BUNDLE);
  const [projectForm, setProjectForm] = useState<ProjectForm>({
    name: 'Demo Project',
    clientName: 'Acme Co',
    objective: 'Increase CTR on Meta ads',
  });
  const [sourceType, setSourceType] = useState<IngestionType>('text');
  const [sourceDraft, setSourceDraft] = useState<SourceDraft>(INITIAL_SOURCE_DRAFT);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const api = useMemo(() => createApiClient(API_BASE_URL), []);

  const activeProject = bundle.project ?? projects.find((project) => project.id === activeProjectId) ?? null;
  const ingestionIds = bundle.ingestions.map((item) => item.id);
  const normalizedIds = bundle.normalizedSources.map((item) => item.id);
  const latestAnalysis = latest(bundle.analyses);
  const latestCreative = latest(bundle.creatives);
  const latestReport = latest(bundle.reports);
  const latestJob = latest(bundle.jobs);

  useEffect(() => {
    saveLocalStorage(STORAGE_KEYS.activeProjectId, activeProjectId);
  }, [activeProjectId]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let active = true;
    const loadProjects = async () => {
      try {
        const nextProjects = await api.listProjects();
        if (!active) return;
        setProjects(nextProjects);
        if (!activeProjectId && nextProjects.length > 0) {
          setActiveProjectId(nextProjects[0].id);
        }
        if (activeProjectId && nextProjects.length > 0 && !nextProjects.some((project) => project.id === activeProjectId)) {
          setActiveProjectId(nextProjects[0].id);
        }
      } catch (error) {
        if (!active) return;
        setNotice({
          tone: 'error',
          title: 'Could not load projects',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    void loadProjects();
    return () => {
      active = false;
    };
  }, [activeProjectId, api]);

  useEffect(() => {
    if (!activeProjectId) return undefined;

    let active = true;
    const loadBundle = async () => {
      try {
        const [project, ingestions, normalizedSources, analyses, creatives, reports, jobs] = await Promise.all([
          api.getProject(activeProjectId),
          api.listIngestions(activeProjectId),
          api.listNormalizations(activeProjectId),
          api.listAnalyses(activeProjectId),
          api.listCreatives(activeProjectId),
          api.listReports(activeProjectId),
          api.listJobs(activeProjectId),
        ]);

        if (!active) return;
        setBundle({
          project,
          ingestions,
          normalizedSources,
          analyses,
          creatives,
          reports,
          jobs,
        });
      } catch (error) {
        if (!active) return;
        setNotice({
          tone: 'error',
          title: 'Could not load project data',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    void loadBundle();
    const interval = window.setInterval(() => {
      void loadBundle();
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [activeProjectId, api]);

  async function refreshProjects(nextActiveId?: string) {
    const nextProjects = await api.listProjects();
    setProjects(nextProjects);
    const nextId = nextActiveId || activeProjectId || nextProjects[0]?.id || '';
    if (nextId && nextProjects.some((project) => project.id === nextId)) {
      setActiveProjectId(nextId);
    }
    return nextProjects;
  }

  async function refreshActiveProject(projectId = activeProjectId) {
    if (!projectId) return;
    const [project, ingestions, normalizedSources, analyses, creatives, reports, jobs] = await Promise.all([
      api.getProject(projectId),
      api.listIngestions(projectId),
      api.listNormalizations(projectId),
      api.listAnalyses(projectId),
      api.listCreatives(projectId),
      api.listReports(projectId),
      api.listJobs(projectId),
    ]);

    setBundle({ project, ingestions, normalizedSources, analyses, creatives, reports, jobs });
  }

  async function runAction<T>(label: string, task: () => Promise<T>, successMessage: string) {
    setBusyAction(label);
    try {
      const result = await task();
      setNotice({
        tone: 'success',
        title: 'Action complete',
        message: successMessage,
      });
      return result;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : error instanceof Error ? error.message : 'Unknown error';
      setNotice({
        tone: 'error',
        title: 'Action failed',
        message,
      });
      throw error;
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectForm.name.trim()) {
      setNotice({
        tone: 'error',
        title: 'Project name is required',
        message: 'Give the project a name before creating it.',
      });
      return;
    }

    const created = await runAction(
      'project',
      () =>
        api.createProject({
          name: projectForm.name.trim(),
          clientName: projectForm.clientName.trim() || undefined,
          objective: projectForm.objective.trim() || undefined,
        }),
      'Project created and selected.',
    );

    await refreshProjects(created.id);
    setProjectForm((current) => ({ ...current, name: '', clientName: '', objective: '' }));
  }

  async function handleCreateIngestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeProjectId) return;

    let payload: IngestionPayload;
    try {
      payload = buildIngestionPayload(sourceType, sourceDraft);
    } catch (error) {
      setNotice({
        tone: 'error',
        title: 'Invalid CSV rows JSON',
        message: error instanceof Error ? error.message : 'Rows JSON must be valid JSON.',
      });
      return;
    }
    const hasContent =
      payload.url ||
      payload.text ||
      payload.imageUrl ||
      payload.csvText ||
      (Array.isArray(payload.rows) && payload.rows.length > 0);

    if (!hasContent) {
      setNotice({
        tone: 'error',
        title: 'Add some source material',
        message: 'The ingestion needs at least one real field filled in.',
      });
      return;
    }

    await runAction(
      'ingestion',
      () => api.createIngestion(activeProjectId, sourceType, payload),
      'Source captured. Ollama normalization starts automatically.',
    );
    await refreshActiveProject();
  }

  async function handleNormalize() {
    if (!activeProjectId || ingestionIds.length === 0) {
      setNotice({
        tone: 'error',
        title: 'No ingestions yet',
        message: 'Create at least one ingestion before normalizing.',
      });
      return;
    }

    await runAction(
      'normalization',
      () => api.normalizeProject(activeProjectId, ingestionIds),
      'Normalization job started.',
    );
    await refreshActiveProject();
  }

  async function handleAnalyze() {
    if (!activeProjectId || normalizedIds.length === 0) {
      setNotice({
        tone: 'error',
        title: 'No normalized sources yet',
        message: 'Normalize at least one ingestion before analysis.',
      });
      return;
    }

    await runAction(
      'analysis',
      () => api.createAnalysis(activeProjectId, normalizedIds),
      'Analysis job started.',
    );
    await refreshActiveProject();
  }

  async function handleCreative() {
    if (!activeProjectId || !latestAnalysis) {
      setNotice({
        tone: 'error',
        title: 'Analysis required first',
        message: 'Run analysis before generating creative concepts.',
      });
      return;
    }

    await runAction(
      'creative',
      () => api.createCreative(activeProjectId, latestAnalysis.id),
      'Creative job started.',
    );
    await refreshActiveProject();
  }

  async function handleReport() {
    if (!activeProjectId || !latestAnalysis || !latestCreative) {
      setNotice({
        tone: 'error',
        title: 'Analysis and creative required',
        message: 'Generate the analysis and creative outputs before building a report.',
      });
      return;
    }

    await runAction(
      'report',
      () => api.createReport(activeProjectId, latestAnalysis.id, latestCreative.id),
      'Report job started.',
    );
    await refreshActiveProject();
  }

  async function handleDownload(report: Report) {
    try {
      const response = await api.downloadReport(report.id);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `report-${report.id}.txt`;
      document.body.append(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      setNotice({
        tone: 'success',
        title: 'Download ready',
        message: 'The report export placeholder was downloaded.',
      });
    } catch (error) {
      setNotice({
        tone: 'error',
        title: 'Could not download report',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient--one" />
      <div className="ambient ambient--two" />

      <aside className="sidebar">
        <div className="brand">
          <div className="brand__mark">AM</div>
          <div>
            <p className="eyebrow">Operator Console</p>
            <h1>AI Marketing System</h1>
          </div>
        </div>

        <Panel eyebrow="Create" title="New project" description="Start with a client, objective, and a working name.">
          <form className="stack stack--tight" onSubmit={handleCreateProject}>
            <Field label="Project name">
              <input
                className="input"
                value={projectForm.name}
                onChange={(event) => setProjectForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Pipeline demo"
              />
            </Field>
            <Field label="Client name">
              <input
                className="input"
                value={projectForm.clientName}
                onChange={(event) => setProjectForm((current) => ({ ...current, clientName: event.target.value }))}
                placeholder="Acme Co"
              />
            </Field>
            <Field label="Objective">
              <textarea
                className="textarea"
                value={projectForm.objective}
                onChange={(event) => setProjectForm((current) => ({ ...current, objective: event.target.value }))}
                rows={4}
                placeholder="Increase CTR and identify winning Meta ad angles."
              />
            </Field>
            <button className="button button--primary" type="submit" disabled={busyAction === 'project'}>
              {busyAction === 'project' ? 'Creating...' : 'Create project'}
            </button>
          </form>
        </Panel>

        <Panel eyebrow="Projects" title="Workspace list" description="Switch between projects without leaving the console.">
          <div className="stack">
            {projects.length === 0 ? (
              <div className="empty-state">
                <p>No projects yet.</p>
                <span>Create the first project to begin the pipeline.</span>
              </div>
            ) : (
              projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className={classNames('project-card', project.id === activeProjectId && 'project-card--active')}
                  onClick={() => setActiveProjectId(project.id)}
                >
                  <strong>{project.name}</strong>
                  <span>{project.clientName || 'No client set'}</span>
                  <small>{project.objective || 'No objective yet'}</small>
                </button>
              ))
            )}
          </div>
        </Panel>
      </aside>

      <main className="workspace">
        <header className="hero">
          <div>
            <p className="eyebrow">Marketing intelligence pipeline</p>
            <h2>Run the full flow from source capture to report download.</h2>
            <p className="hero__copy">
              Build projects, ingest text or creative assets, normalize the input, and push the analysis through Ollama-backed
              insight, creative, and reporting stages.
            </p>
          </div>

          <div className="hero__stats">
            <div className="stat">
              <span>Selected project</span>
              <strong>{activeProject?.name || 'None selected'}</strong>
            </div>
            <div className="stat">
              <span>Latest job</span>
              <strong>{latestJob ? `${latestJob.kind} · ${latestJob.status}` : 'No jobs yet'}</strong>
            </div>
            <button className="button button--ghost" type="button" onClick={() => void refreshActiveProject()}>
              Sync workspace
            </button>
          </div>
        </header>

        {notice ? (
          <div className={classNames('notice', `notice--${notice.tone}`)}>
            <strong>{notice.title}</strong>
            <span>{notice.message}</span>
          </div>
        ) : null}

        <section className="metrics-grid">
          <div className="metric-card">
            <span>Ingestions</span>
            <strong>{bundle.ingestions.length}</strong>
          </div>
          <div className="metric-card">
            <span>Normalized sources</span>
            <strong>{bundle.normalizedSources.length}</strong>
          </div>
          <div className="metric-card">
            <span>Analyses</span>
            <strong>{bundle.analyses.length}</strong>
          </div>
          <div className="metric-card">
            <span>Creative sets</span>
            <strong>{bundle.creatives.length}</strong>
          </div>
          <div className="metric-card">
            <span>Reports</span>
            <strong>{bundle.reports.length}</strong>
          </div>
          <div className="metric-card">
            <span>Jobs</span>
            <strong>{bundle.jobs.length}</strong>
          </div>
        </section>

        <div className="workflow-grid">
          <Panel
            eyebrow="1 · Source capture"
            title="Add Meta inputs, text, or CSV exports"
            description="Switch between source types to create the raw records the pipeline needs."
          >
            <div className="source-tabs">
              {SOURCE_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  className={classNames('tab', sourceType === option.type && 'tab--active')}
                  onClick={() => setSourceType(option.type)}
                >
                  <strong>{option.label}</strong>
                  <span>{option.hint}</span>
                </button>
              ))}
            </div>

            <form className="stack stack--tight" onSubmit={handleCreateIngestion}>
              <div className="grid grid--two">
                <Field label="Source name">
                  <input
                    className="input"
                    value={sourceDraft.sourceName}
                    onChange={(event) => setSourceDraft((current) => ({ ...current, sourceName: event.target.value }))}
                    placeholder="Forums review bundle"
                  />
                </Field>
                {sourceType === 'url' ? (
                  <Field label="Page title">
                    <input
                      className="input"
                      value={sourceDraft.title}
                      onChange={(event) => setSourceDraft((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Landing page"
                    />
                  </Field>
                ) : null}
              </div>

              {sourceType === 'url' ? (
                <Field label="Product URL">
                  <input
                    className="input"
                    value={sourceDraft.url}
                    onChange={(event) => setSourceDraft((current) => ({ ...current, url: event.target.value }))}
                    placeholder="https://example.com"
                  />
                </Field>
              ) : null}

              {sourceType === 'text' ? (
                <Field label="Customer feedback">
                  <textarea
                    className="textarea"
                    rows={6}
                    value={sourceDraft.text}
                    onChange={(event) => setSourceDraft((current) => ({ ...current, text: event.target.value }))}
                  />
                </Field>
              ) : null}

              {sourceType === 'image' ? (
                <div className="grid grid--two">
                  <Field label="Image name">
                    <input
                      className="input"
                      value={sourceDraft.imageName}
                      onChange={(event) => setSourceDraft((current) => ({ ...current, imageName: event.target.value }))}
                      placeholder="Meta creative 14"
                    />
                  </Field>
                  <Field label="Image URL">
                    <input
                      className="input"
                      value={sourceDraft.imageUrl}
                      onChange={(event) => setSourceDraft((current) => ({ ...current, imageUrl: event.target.value }))}
                      placeholder="https://..."
                    />
                  </Field>
                </div>
              ) : null}

              {sourceType === 'csv' ? (
                <div className="stack stack--tight">
                  <Field label="CSV text">
                    <textarea
                      className="textarea"
                      rows={5}
                      value={sourceDraft.csvText}
                      onChange={(event) => setSourceDraft((current) => ({ ...current, csvText: event.target.value }))}
                    />
                  </Field>
                  <Field label="Rows JSON" hint="Optional. Paste structured rows when you have them.">
                    <textarea
                      className="textarea"
                      rows={4}
                      value={sourceDraft.rowsJson}
                      onChange={(event) => setSourceDraft((current) => ({ ...current, rowsJson: event.target.value }))}
                      placeholder='[{"ad_name":"Launch 01","impressions":12000}]'
                    />
                  </Field>
                </div>
              ) : null}

              <button className="button button--primary" type="submit" disabled={busyAction === 'ingestion'}>
                {busyAction === 'ingestion' ? 'Saving...' : 'Create ingestion'}
              </button>
            </form>
          </Panel>

          <Panel
            eyebrow="2 · Normalize"
            title="Clean and shape the inputs"
            description="Ollama rewrites each captured source into a shared schema ready for analysis."
            action={
              <button className="button button--ghost" type="button" onClick={() => void handleNormalize()} disabled={busyAction === 'normalization'}>
                {busyAction === 'normalization' ? 'Running...' : 'Re-run normalization'}
              </button>
            }
          >
            <div className="mini-list">
              {bundle.normalizedSources.length === 0 ? (
                <div className="empty-state compact">
                  <p>No normalized sources yet.</p>
                  <span>Normalization starts automatically after each ingestion.</span>
                </div>
              ) : (
                bundle.normalizedSources.slice().reverse().map((source) => (
                  <article key={source.id} className="record-card">
                    <div className="record-card__title">
                      <strong>{source.id}</strong>
                      <Pill tone={statusTone(source.status)}>{source.status}</Pill>
                    </div>
                    <p>{source.ingestionId}</p>
                    {source.status === 'failed' && source.error ? <small className="error-text">{source.error}</small> : null}
                    <small>{formatTime(source.createdAt)}</small>
                  </article>
                ))
              )}
            </div>
          </Panel>

          <Panel
            eyebrow="3 · Insight extraction"
            title="Run Ollama analysis"
            description="Pull marketing angles, objections, and performance commentary from normalized data."
            action={
              <button className="button button--ghost" type="button" onClick={() => void handleAnalyze()} disabled={busyAction === 'analysis'}>
                {busyAction === 'analysis' ? 'Running...' : 'Analyze'}
              </button>
            }
          >
            <div className="artifact-grid">
              <div className="artifact-card">
                <span>Latest analysis</span>
                <strong>{latestAnalysis ? latestAnalysis.id : 'No analysis yet'}</strong>
                <p>{latestAnalysis ? summarizeAnalysis(latestAnalysis.result) : 'Run analysis after normalization.'}</p>
              </div>
              <div className="artifact-card">
                <span>Input sources</span>
                <strong>{normalizedIds.length}</strong>
                <p>{normalizedIds.length ? normalizedIds.join(', ') : 'Nothing normalized yet.'}</p>
              </div>
            </div>
            {latestAnalysis ? <JsonBlock value={latestAnalysis.result} /> : null}
          </Panel>

          <Panel
            eyebrow="4 · Creative generation"
            title="Shape ad concepts"
            description="Use the latest analysis to generate hooks, messages, and conversion angles."
            action={
              <button className="button button--ghost" type="button" onClick={() => void handleCreative()} disabled={busyAction === 'creative'}>
                {busyAction === 'creative' ? 'Running...' : 'Generate creative'}
              </button>
            }
          >
            <div className="artifact-grid">
              <div className="artifact-card">
                <span>Latest creative set</span>
                <strong>{latestCreative ? latestCreative.id : 'No creative set yet'}</strong>
                <p>{latestCreative ? summarizeCreative(latestCreative.output) : 'Generate creative after analysis.'}</p>
              </div>
              <div className="artifact-card">
                <span>Analysis source</span>
                <strong>{latestAnalysis ? latestAnalysis.id : '—'}</strong>
                <p>{latestAnalysis ? 'Will be used to craft the creative concepts.' : 'You need an analysis first.'}</p>
              </div>
            </div>
            {latestCreative ? <JsonBlock value={latestCreative.output} /> : null}
          </Panel>

          <Panel
            eyebrow="5 · Reporting"
            title="Package the findings"
            description="Combine the analysis and creative outputs into a report the client can review."
            action={
              <button className="button button--ghost" type="button" onClick={() => void handleReport()} disabled={busyAction === 'report'}>
                {busyAction === 'report' ? 'Running...' : 'Build report'}
              </button>
            }
          >
            <div className="artifact-grid">
              <div className="artifact-card">
                <span>Latest report</span>
                <strong>{latestReport ? latestReport.id : 'No report yet'}</strong>
                <p>{latestReport ? summarizeReport(latestReport.summary) : 'Run report generation when analysis and creative are complete.'}</p>
              </div>
              <div className="artifact-card">
                <span>Download state</span>
                <strong>{latestReport?.pdfUrl ? 'Ready' : 'Waiting'}</strong>
                <p>{latestReport?.pdfUrl || 'A placeholder download becomes available once the report completes.'}</p>
              </div>
            </div>
            <div className="stack stack--tight">
              {latestReport ? (
                <div className="report-actions">
                  <button
                    className="button button--primary"
                    type="button"
                    onClick={() => void handleDownload(latestReport)}
                    disabled={!latestReport.pdfUrl}
                  >
                    Download report
                  </button>
                  <Pill tone={statusTone(latestReport.status)}>{latestReport.status}</Pill>
                </div>
              ) : null}
              {latestReport ? <JsonBlock value={{ summary: latestReport.summary, pdfUrl: latestReport.pdfUrl }} /> : null}
            </div>
          </Panel>

          <Panel
            eyebrow="6 · Operations"
            title="Jobs and status"
            description="Watch the asynchronous jobs move through their lifecycle."
            className="panel--wide"
          >
            <div className="jobs-table">
              {bundle.jobs.length === 0 ? (
                <div className="empty-state compact">
                  <p>No jobs yet.</p>
                  <span>As you run the pipeline, jobs will appear here with their timestamps.</span>
                </div>
              ) : (
                bundle.jobs
                  .slice()
                  .reverse()
                  .map((job) => (
                    <article className="job-row" key={job.id}>
                      <div>
                        <strong>
                          {job.kind} · {job.id}
                        </strong>
                        <p>{job.input ? JSON.stringify(job.input) : 'No job input captured.'}</p>
                      </div>
                      <div className="job-row__meta">
                        <Pill tone={statusTone(job.status)}>{job.status}</Pill>
                        <small>Started {formatTime(job.startedAt)}</small>
                        <small>Completed {formatTime(job.completedAt)}</small>
                      </div>
                    </article>
                  ))
              )}
            </div>
          </Panel>

          <Panel
            eyebrow="Workspace"
            title="Project detail"
            description="A compact view of the selected project and its latest activity."
            className="panel--wide"
          >
            <div className="detail-grid">
              <div className="detail-card">
                <span>Project</span>
                <strong>{activeProject?.name || 'No project selected'}</strong>
                <p>{activeProject?.objective || 'Create or select a project to begin.'}</p>
              </div>
              <div className="detail-card">
                <span>Client</span>
                <strong>{activeProject?.clientName || '—'}</strong>
                <p>{activeProject ? activeProject.id : 'Select a project to see the dashboard.'}</p>
              </div>
              <div className="detail-card">
                <span>Latest ingestion</span>
                <strong>{latest(bundle.ingestions)?.id || '—'}</strong>
                <p>{latest(bundle.ingestions)?.type || 'No source captured yet.'}</p>
              </div>
              <div className="detail-card">
                <span>Latest normalized source</span>
                <strong>{latest(bundle.normalizedSources)?.id || '—'}</strong>
                <p>{latest(bundle.normalizedSources)?.status || 'Nothing normalized yet.'}</p>
              </div>
            </div>
          </Panel>
        </div>
      </main>
    </div>
  );
}
