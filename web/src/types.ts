export type HealthResponse = {
  status: string;
  service?: string;
  timestamp?: string;
};

export type Project = {
  id: string;
  name: string;
  clientName: string | null;
  objective: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IngestionType = 'url' | 'text' | 'image' | 'csv';

export type IngestionPayload = {
  url?: string;
  title?: string;
  text?: string;
  sourceName?: string;
  imageName?: string;
  imageUrl?: string;
  rows?: unknown[];
  csvText?: string;
};

export type Ingestion = {
  id: string;
  projectId: string;
  type: IngestionType;
  status: 'received' | 'failed';
  payload: IngestionPayload;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type NormalizedSource = {
  id: string;
  projectId: string;
  ingestionId: string;
  status: 'queued' | 'completed' | 'failed';
  data?: unknown;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type Analysis = {
  id: string;
  projectId: string;
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  inputNormalizedIds: string[];
  stages: {
    insightExtraction: 'pending' | 'running' | 'completed' | 'failed';
    performanceAnalysis: 'pending' | 'running' | 'completed' | 'failed';
    creativeAnalysis: 'pending' | 'running' | 'completed' | 'failed';
  };
  result: unknown;
  retries: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type Creative = {
  id: string;
  projectId: string;
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  analysisId?: string;
  output: unknown;
  retries: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type Report = {
  id: string;
  projectId: string;
  jobId: string;
  analysisId: string | null;
  creativeId?: string | null;
  status: 'queued' | 'running' | 'completed' | 'failed';
  summary: string;
  pdfUrl: string | null;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type Job = {
  id: string;
  projectId: string;
  kind: 'normalization' | 'analysis' | 'creative' | 'report';
  status: 'queued' | 'running' | 'completed' | 'failed';
  retries: number;
  maxRetries: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type DashboardBundle = {
  project: Project | null;
  ingestions: Ingestion[];
  normalizedSources: NormalizedSource[];
  analyses: Analysis[];
  creatives: Creative[];
  reports: Report[];
  jobs: Job[];
};
