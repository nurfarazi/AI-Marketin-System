import { readNumberEnv, readTrimmedEnv } from '../config/env';

type OllamaGenerateRequest = {
  model: string;
  prompt: string;
  system?: string;
  stream?: boolean;
  options?: Record<string, unknown>;
};

type OllamaGenerateResponse = {
  response?: string;
  done?: boolean;
  error?: string;
};

type OllamaChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type OllamaChatRequest = {
  model: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  options?: Record<string, unknown>;
};

type OllamaChatResponse = {
  message?: { role: 'assistant'; content: string };
  done?: boolean;
  error?: string;
};

type OllamaConfig = {
  baseUrl?: string;
  model?: string;
  temperature?: number;
};

function getConfig(overrides?: OllamaConfig) {
  return {
    baseUrl: overrides?.baseUrl ?? readTrimmedEnv('OLLAMA_BASE_URL'),
    model: overrides?.model ?? readTrimmedEnv('OLLAMA_MODEL'),
    temperature: overrides?.temperature ?? readNumberEnv('OLLAMA_TEMPERATURE'),
  };
}

async function postJson<T>(baseUrl: string, path: string, payload: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }); 
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown network failure.';
    throw new Error(`Unable to reach Ollama at ${baseUrl}${path}. Is Ollama running? ${reason}`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<T>;
}

export async function generateText(prompt: string, system?: string, config?: OllamaConfig) {
  const { baseUrl, model, temperature } = getConfig(config);
  const payload: OllamaGenerateRequest = {
    model,
    prompt,
    system,
    stream: false,
    options: { temperature },
  };

  const response = await postJson<OllamaGenerateResponse>(baseUrl, '/api/generate', payload);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.response?.trim() || '';
}

export async function chat(messages: OllamaChatMessage[], config?: OllamaConfig) {
  const { baseUrl, model, temperature } = getConfig(config);
  const payload: OllamaChatRequest = {
    model,
    messages,
    stream: false,
    options: { temperature },
  };

  const response = await postJson<OllamaChatResponse>(baseUrl, '/api/chat', payload);
  if (response.error) {
    throw new Error(response.error);
  }
  return response.message?.content?.trim() || '';
}

export async function generateJson<T>(prompt: string, system?: string, config?: OllamaConfig) {
  const text = await generateText(prompt, system, config);
  try {
    return JSON.parse(text) as T;
  } catch (_error) {
    return null;
  }
}

export type { OllamaConfig, OllamaChatMessage };
