import { generateText } from './ollama';
import type { PipelineOutput } from './pipeline';

type ReportInput = {
  projectName: string;
  objective?: string | null;
  pipeline: PipelineOutput;
};

export async function generateReportNarrative(input: ReportInput) {
  const prompt = [
    `Project: ${input.projectName}`,
    input.objective ? `Objective: ${input.objective}` : '',
    '',
    'Insights:',
    JSON.stringify(input.pipeline.insights, null, 2),
    '',
    'Performance:',
    JSON.stringify(input.pipeline.performance, null, 2),
    '',
    'Creative:',
    JSON.stringify(input.pipeline.creative, null, 2),
    '',
    'Write a concise executive summary and key recommendations.',
  ].join('\n');

  return generateText(prompt, 'You are a senior marketing consultant.');
}

export type { ReportInput };
