import test from 'node:test';
import assert from 'node:assert/strict';
import { generateText } from '../src/services/ollama';

test('ollama config falls back to safe local defaults', async () => {
  const originalEnv = {
    baseUrl: process.env.OLLAMA_BASE_URL,
    model: process.env.OLLAMA_MODEL,
    temperature: process.env.OLLAMA_TEMPERATURE,
  };
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; body: Record<string, unknown> }> = [];

  delete process.env.OLLAMA_BASE_URL;
  delete process.env.OLLAMA_MODEL;
  delete process.env.OLLAMA_TEMPERATURE;

  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    requests.push({ url, body: JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown> });

    return new Response(JSON.stringify({ response: 'unexpected success', done: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const result = await generateText('Hello world');
    assert.equal(result, 'unexpected success');
    assert.equal(requests.length, 1);
    assert.equal(requests[0]?.url, 'http://127.0.0.1:11434/api/generate');
    assert.equal(requests[0]?.body.model, 'llama3.1');
    assert.equal((requests[0]?.body.options as Record<string, unknown> | undefined)?.temperature, 0.2);
  } finally {
    if (originalEnv.baseUrl === undefined) {
      delete process.env.OLLAMA_BASE_URL;
    } else {
      process.env.OLLAMA_BASE_URL = originalEnv.baseUrl;
    }

    if (originalEnv.model === undefined) {
      delete process.env.OLLAMA_MODEL;
    } else {
      process.env.OLLAMA_MODEL = originalEnv.model;
    }

    if (originalEnv.temperature === undefined) {
      delete process.env.OLLAMA_TEMPERATURE;
    } else {
      process.env.OLLAMA_TEMPERATURE = originalEnv.temperature;
    }

    globalThis.fetch = originalFetch;
  }
});

test('ollama config rejects non-local base urls', async () => {
  const originalEnv = {
    baseUrl: process.env.OLLAMA_BASE_URL,
    model: process.env.OLLAMA_MODEL,
    temperature: process.env.OLLAMA_TEMPERATURE,
  };

  process.env.OLLAMA_BASE_URL = 'https://example.com';
  process.env.OLLAMA_MODEL = 'llama3.1';
  process.env.OLLAMA_TEMPERATURE = '0.2';

  try {
    await assert.rejects(() => generateText('Hello world'), /localhost|safety/i);
  } finally {
    if (originalEnv.baseUrl === undefined) {
      delete process.env.OLLAMA_BASE_URL;
    } else {
      process.env.OLLAMA_BASE_URL = originalEnv.baseUrl;
    }

    if (originalEnv.model === undefined) {
      delete process.env.OLLAMA_MODEL;
    } else {
      process.env.OLLAMA_MODEL = originalEnv.model;
    }

    if (originalEnv.temperature === undefined) {
      delete process.env.OLLAMA_TEMPERATURE;
    } else {
      process.env.OLLAMA_TEMPERATURE = originalEnv.temperature;
    }
  }
});
