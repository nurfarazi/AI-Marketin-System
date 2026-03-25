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

const DEFAULT_BASE_URL = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'llama3.1';

function getConfig(overrides?: OllamaConfig) {
  return {
    baseUrl: overrides?.baseUrl || process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL,
    model: overrides?.model || process.env.OLLAMA_MODEL || DEFAULT_MODEL,
    temperature: overrides?.temperature ?? Number(process.env.OLLAMA_TEMPERATURE ?? 0.2),
  };
}

async function postJson<T>(baseUrl: string, path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

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
