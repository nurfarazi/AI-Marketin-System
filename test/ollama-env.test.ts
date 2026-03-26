import test from 'node:test';
import assert from 'node:assert/strict';
import { generateText } from '../src/services/ollama';

test('ollama config must be provided by env', async () => {
  const originalEnv = {
    baseUrl: process.env.OLLAMA_BASE_URL,
    model: process.env.OLLAMA_MODEL,
    temperature: process.env.OLLAMA_TEMPERATURE,
  };
  const originalFetch = globalThis.fetch;

  delete process.env.OLLAMA_BASE_URL;
  delete process.env.OLLAMA_MODEL;
  delete process.env.OLLAMA_TEMPERATURE;

  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ response: 'unexpected success', done: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch;

  try {
    await assert.rejects(() => generateText('Hello world'), /OLLAMA_/i);
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
