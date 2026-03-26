export type Project = {
  id: string;
  name: string;
  clientName: string | null;
  objective: string | null;
  createdAt: string;
  updatedAt: string;
};

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';
export type JobKind = 'normalization' | 'analysis' | 'report' | 'creative';

export type IngestionStatus = 'received' | 'failed';
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

export type NormalizedSourceData = {
  kind: 'normalized';
  sourceType: IngestionType;
  content: string;
  title?: string | null;
  sourceName?: string | null;
  url?: string | null;
  imageName?: string | null;
  imageUrl?: string | null;
  rows?: unknown[] | null;
  csvText?: string | null;
  extractedText?: string | null;
  summary?: string | null;
  highlights?: string[];
  entities?: Array<Record<string, unknown>>;
  confidence?: number;
  meta?: Record<string, unknown>;
};

export type Ingestion = {
  id: string;
  projectId: string;
  type: IngestionType;
  status: IngestionStatus;
  payload: IngestionPayload;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type NormalizationStatus = 'queued' | 'completed' | 'failed';

export type NormalizedSource = {
  id: string;
  projectId: string;
  ingestionId: string;
  status: NormalizationStatus;
  data?: NormalizedSourceData | null;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type AnalysisStageStatus = 'pending' | 'running' | 'completed' | 'failed';
export type AnalysisStatus = JobStatus;

export type Analysis = {
  id: string;
  projectId: string;
  jobId: string;
  status: AnalysisStatus;
  inputNormalizedIds: string[];
  stages: {
    insightExtraction: AnalysisStageStatus;
    performanceAnalysis: AnalysisStageStatus;
    creativeAnalysis: AnalysisStageStatus;
  };
  result: unknown;
  retries: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreativeStatus = JobStatus;

export type Creative = {
  id: string;
  projectId: string;
  jobId: string;
  status: CreativeStatus;
  analysisId?: string;
  output: unknown;
  retries: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReportStatus = JobStatus;

export type Report = {
  id: string;
  projectId: string;
  jobId: string;
  analysisId: string | null;
  creativeId?: string | null;
  status: ReportStatus;
  summary: string;
  pdfUrl: string | null;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type Job = {
  id: string;
  projectId: string;
  kind: JobKind;
  status: JobStatus;
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
