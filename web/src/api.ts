import type {
  Analysis,
  Creative,
  DashboardBundle,
  HealthResponse,
  Ingestion,
  IngestionPayload,
  IngestionType,
  Job,
  NormalizedSource,
  Project,
  Report,
} from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function resolveUrl(baseUrl: string, path: string) {
  const normalizedBase = trimTrailingSlash(baseUrl.trim() || 'http://localhost:5011');
  if (/^https?:\/\//i.test(normalizedBase)) {
    return new URL(path, `${normalizedBase}/`).toString();
  }

  return `${normalizedBase}${path.startsWith('/') ? '' : '/'}${path}`;
}

async function readBody(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function request<T>(baseUrl: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(resolveUrl(baseUrl, path), {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
    ...init,
  });

  const payload = await readBody(response);
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error?: unknown }).error ?? response.statusText)
        : response.statusText;
    throw new ApiError(response.status, message, payload);
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

async function requestBlob(baseUrl: string, path: string) {
  const response = await fetch(resolveUrl(baseUrl, path));
  if (!response.ok) {
    const payload = await readBody(response);
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error?: unknown }).error ?? response.statusText)
        : response.statusText;
    throw new ApiError(response.status, message, payload);
  }

  return response;
}

export function createApiClient(baseUrl: string) {
  return {
    health: () => request<HealthResponse>(baseUrl, '/health'),
    listProjects: () => request<Project[]>(baseUrl, '/api/v1/projects'),
    createProject: (payload: { name: string; clientName?: string; objective?: string }) =>
      request<Project>(baseUrl, '/api/v1/projects', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getProject: (projectId: string) => request<Project>(baseUrl, `/api/v1/projects/${projectId}`),
    listIngestions: (projectId: string) => request<Ingestion[]>(baseUrl, `/api/v1/projects/${projectId}/ingestions`),
    createIngestion: (projectId: string, type: IngestionType, payload: IngestionPayload) =>
      request<Ingestion>(baseUrl, `/api/v1/projects/${projectId}/ingestions`, {
        method: 'POST',
        body: JSON.stringify({ type, payload }),
      }),
    normalizeProject: (projectId: string, ingestionIds: string[]) =>
      request<{ job: Job; normalizedSources: NormalizedSource[] }>(
        baseUrl,
        `/api/v1/projects/${projectId}/normalizations`,
        {
          method: 'POST',
          body: JSON.stringify({ ingestionIds }),
        },
      ),
    listNormalizations: (projectId: string) =>
      request<NormalizedSource[]>(baseUrl, `/api/v1/projects/${projectId}/normalizations`),
    createAnalysis: (projectId: string, normalizedIds: string[]) =>
      request<{ analysis: Analysis; job: Job }>(baseUrl, `/api/v1/projects/${projectId}/analyses`, {
        method: 'POST',
        body: JSON.stringify({ normalizedIds }),
      }),
    listAnalyses: (projectId: string) => request<Analysis[]>(baseUrl, `/api/v1/projects/${projectId}/analyses`),
    getAnalysis: (analysisId: string) => request<Analysis>(baseUrl, `/api/v1/analyses/${analysisId}`),
    createCreative: (projectId: string, analysisId: string) =>
      request<{ creative: Creative; job: Job }>(baseUrl, `/api/v1/projects/${projectId}/creatives`, {
        method: 'POST',
        body: JSON.stringify({ analysisId }),
      }),
    listCreatives: (projectId: string) => request<Creative[]>(baseUrl, `/api/v1/projects/${projectId}/creatives`),
    getCreative: (creativeId: string) => request<Creative>(baseUrl, `/api/v1/creatives/${creativeId}`),
    createReport: (projectId: string, analysisId: string, creativeId: string) =>
      request<{ report: Report; job: Job }>(baseUrl, `/api/v1/projects/${projectId}/reports`, {
        method: 'POST',
        body: JSON.stringify({ analysisId, creativeId }),
      }),
    listReports: (projectId: string) => request<Report[]>(baseUrl, `/api/v1/projects/${projectId}/reports`),
    getReport: (reportId: string) => request<Report>(baseUrl, `/api/v1/reports/${reportId}`),
    downloadReport: (reportId: string) => requestBlob(baseUrl, `/api/v1/reports/${reportId}/download`),
    listJobs: (projectId: string) => request<Job[]>(baseUrl, `/api/v1/projects/${projectId}/jobs`),
    getJob: (jobId: string) => request<Job>(baseUrl, `/api/v1/jobs/${jobId}`),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
