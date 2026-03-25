type UrlPayload = { url?: string; title?: string };
type TextPayload = { text?: string; sourceName?: string };
type ImagePayload = { imageName?: string; imageUrl?: string };
type CsvPayload = { rows?: unknown[]; csvText?: string };

export function normalizeUrlSource(payload: UrlPayload) {
  if (!payload.url) return null;
  return {
    kind: 'url' as const,
    url: payload.url,
    title: payload.title || null,
    extractedText: `Normalized website content from ${payload.url}`,
  };
}

export function normalizeTextSource(payload: TextPayload) {
  if (!payload.text) return null;
  return {
    kind: 'text' as const,
    text: payload.text,
    sourceName: payload.sourceName || null,
  };
}

export function normalizeImageSource(payload: ImagePayload) {
  if (!payload.imageName && !payload.imageUrl) return null;
  return {
    kind: 'image' as const,
    imageName: payload.imageName || null,
    imageUrl: payload.imageUrl || null,
    extractedText: 'Placeholder OCR output',
  };
}

export function normalizeCsvSource(payload: CsvPayload) {
  if (!payload.rows && !payload.csvText) return null;
  return {
    kind: 'csv' as const,
    rows: payload.rows || null,
    csvText: payload.csvText || null,
    parsedRecords: [],
  };
}

