import { generateJson } from './ollama';
import type { Ingestion, NormalizedSourceData } from '../types';

type NormalizationCandidate = Partial<NormalizedSourceData> & {
  kind?: string;
  sourceType?: string;
  content?: unknown;
  summary?: unknown;
  extractedText?: unknown;
  meta?: Record<string, unknown>;
};

type NormalizationResult = {
  data: NormalizedSourceData;
  attempts: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asOptionalString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function asOptionalStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : undefined;
}

function asOptionalEntityArray(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : undefined;
}

function buildNormalizationPrompt(ingestion: Ingestion) {
  return [
    `Normalize source type: ${ingestion.type}`,
    'Return JSON only.',
    'Use this shared shape:',
    '{',
    '  "kind": "normalized",',
    '  "sourceType": "text|url|image|csv",',
    '  "content": "string",',
    '  "title": "string or null",',
    '  "sourceName": "string or null",',
    '  "url": "string or null",',
    '  "imageName": "string or null",',
    '  "imageUrl": "string or null",',
    '  "rows": [],',
    '  "csvText": "string or null",',
    '  "extractedText": "string or null",',
    '  "summary": "string or null",',
    '  "highlights": [],',
    '  "entities": [],',
    '  "confidence": 0.0,',
    '  "meta": {}',
    '}',
    'Keep the content grounded in the raw payload and preserve the key details for analysis.',
    '',
    'Raw payload:',
    JSON.stringify(ingestion.payload, null, 2),
  ].join('\n');
}

function normalizeCandidate(candidate: unknown, ingestion: Ingestion): NormalizedSourceData | null {
  if (!isRecord(candidate)) return null;

  const normalized: NormalizationCandidate = candidate;
  const content =
    asOptionalString(normalized.content) ??
    asOptionalString(normalized.summary) ??
    asOptionalString(normalized.extractedText);

  if (!content?.trim()) return null;

  return {
    kind: 'normalized',
    sourceType: ingestion.type,
    content,
    title: asOptionalString(normalized.title) ?? null,
    sourceName: asOptionalString(normalized.sourceName) ?? null,
    url: asOptionalString(normalized.url) ?? null,
    imageName: asOptionalString(normalized.imageName) ?? null,
    imageUrl: asOptionalString(normalized.imageUrl) ?? null,
    rows: Array.isArray(normalized.rows) ? normalized.rows : null,
    csvText: asOptionalString(normalized.csvText) ?? null,
    extractedText: asOptionalString(normalized.extractedText) ?? null,
    summary: asOptionalString(normalized.summary) ?? null,
    highlights: asOptionalStringArray(normalized.highlights) ?? [],
    entities: asOptionalEntityArray(normalized.entities) ?? [],
    confidence: typeof normalized.confidence === 'number' ? normalized.confidence : undefined,
    meta: isRecord(normalized.meta) ? normalized.meta : {},
  };
}

export async function normalizeIngestionWithOllama(ingestion: Ingestion): Promise<NormalizationResult> {
  const prompt = buildNormalizationPrompt(ingestion);
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const candidate = await generateJson<unknown>(prompt, 'You are a meticulous data normalization assistant.');
      const normalized = normalizeCandidate(candidate, ingestion);
      if (normalized) {
        return { data: normalized, attempts: attempt };
      }

      lastError = new Error('Ollama returned invalid or incomplete normalization JSON.');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown normalization error.');
    }
  }

  throw new Error(
    lastError?.message || 'Ollama normalization failed after retrying the source once.',
  );
}
