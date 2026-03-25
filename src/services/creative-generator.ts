import { generateJson } from './ollama';
import type { InsightResult } from './pipeline';

type CreativeBrief = {
  product: string;
  audience?: string;
  insights: InsightResult;
};

type CreativeConcepts = {
  concepts: Array<{
    title: string;
    hook: string;
    message: string;
    cta: string;
  }>;
};

export async function generateCreativeConcepts(brief: CreativeBrief) {
  const prompt = [
    `Product: ${brief.product}`,
    brief.audience ? `Audience: ${brief.audience}` : '',
    'Insights:',
    JSON.stringify(brief.insights, null, 2),
    '',
    'Return JSON with key: concepts (array of {title, hook, message, cta}).',
  ].join('\n');

  const result = await generateJson<CreativeConcepts>(prompt, 'You are a direct-response ad creative.');
  return result || { concepts: [] };
}

export type { CreativeBrief, CreativeConcepts };
