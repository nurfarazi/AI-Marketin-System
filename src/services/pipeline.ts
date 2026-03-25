import { chat, generateJson } from './ollama';

type NormalizedInput = {
  kind: string;
  content: string;
  meta?: Record<string, unknown>;
};

type InsightResult = {
  painPoints: string[];
  angles: string[];
  objections: string[];
};

type PerformanceResult = {
  summary: string;
  metrics?: Record<string, unknown>;
  observations?: string[];
};

type CreativeResult = {
  hooks: string[];
  designCritique: string[];
  suggestions?: string[];
};

type PipelineOutput = {
  insights: InsightResult;
  performance: PerformanceResult;
  creative: CreativeResult;
};

function toContextBlock(inputs: NormalizedInput[]) {
  return inputs
    .map((input, index) => {
      const meta = input.meta ? JSON.stringify(input.meta) : '';
      return `Source ${index + 1} (${input.kind}): ${input.content}\n${meta}`;
    })
    .join('\n\n');
}

export async function runInsightExtraction(inputs: NormalizedInput[]) {
  const prompt = [
    'Extract marketing insights from the following normalized sources.',
    'Return JSON with keys: painPoints (array), angles (array), objections (array).',
    'Be concise and grounded in the inputs.',
    '',
    toContextBlock(inputs),
  ].join('\n');

  const result = await generateJson<InsightResult>(prompt, 'You are a senior marketing strategist.');
  return result || { painPoints: [], angles: [], objections: [] };
}

export async function runPerformanceAnalysis(inputs: NormalizedInput[]) {
  const prompt = [
    'Analyze the Meta performance data below. Summarize key metrics and insights.',
    'Return JSON with keys: summary (string), metrics (object), observations (array).',
    '',
    toContextBlock(inputs),
  ].join('\n');

  const result = await generateJson<PerformanceResult>(prompt, 'You are a performance marketing analyst.');
  return result || { summary: '', metrics: {}, observations: [] };
}

export async function runCreativeAnalysis(inputs: NormalizedInput[]) {
  const messages = [
    {
      role: 'system' as const,
      content: 'You are a creative strategist analyzing ad copy and visuals.',
    },
    {
      role: 'user' as const,
      content: [
        'Analyze the creative inputs below.',
        'Return JSON with keys: hooks (array), designCritique (array), suggestions (array).',
        '',
        toContextBlock(inputs),
      ].join('\n'),
    },
  ];

  const response = await chat(messages);
  try {
    return JSON.parse(response) as CreativeResult;
  } catch (_error) {
    return { hooks: [], designCritique: [], suggestions: [] };
  }
}

export async function runFullPipeline(inputs: NormalizedInput[]): Promise<PipelineOutput> {
  const [insights, performance, creative] = await Promise.all([
    runInsightExtraction(inputs),
    runPerformanceAnalysis(inputs),
    runCreativeAnalysis(inputs),
  ]);

  return { insights, performance, creative };
}

export type { NormalizedInput, InsightResult, PerformanceResult, CreativeResult, PipelineOutput };
