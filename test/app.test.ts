import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { MongoClient } from 'mongodb';
import { createApp } from '../src/app';
import { connectToMongo, disconnectMongo } from '../src/db/mongo';
import { createRepositories } from '../src/repositories';

type JsonValue = Record<string, unknown>;
type FetchLike = typeof fetch;

const realFetch = globalThis.fetch.bind(globalThis);
const mongoUri = process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017';
const mongoDbName = process.env.MONGO_DB_NAME ?? 'ai_marketing_system_test';

process.env.MONGO_URI ??= mongoUri;
process.env.MONGO_DB_NAME ??= mongoDbName;

async function startServer() {
  const { db } = await connectToMongo();
  const app = createApp(createRepositories(db));
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  return { server, baseUrl };
}

async function fetchJson(url: string) {
  const response = await fetch(url);
  return response.json() as Promise<JsonValue>;
}

async function postJson(url: string, body: JsonValue) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json() as Promise<JsonValue>;
}

async function ensureMongoAvailable() {
  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 2000 });
  try {
    await client.connect();
    await client.db(mongoDbName).command({ ping: 1 });
    return true;
  } catch {
    return false;
  } finally {
    await client.close().catch(() => undefined);
  }
}

async function resetDatabase() {
  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 2000 });
  try {
    await client.connect();
    await client.db(mongoDbName).dropDatabase();
  } finally {
    await client.close().catch(() => undefined);
  }
}

function installOllamaMock() {
  globalThis.fetch = (async (input: Parameters<FetchLike>[0], init?: Parameters<FetchLike>[1]) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (!url.startsWith('http://127.0.0.1:11434/')) {
      return realFetch(input as Parameters<FetchLike>[0], init);
    }

    const path = new URL(url).pathname;
    const bodyText = typeof init?.body === 'string' ? init.body : '';
    const body = bodyText ? JSON.parse(bodyText) as { prompt?: string; messages?: Array<{ content?: string }> } : {};
    const prompt = body.prompt || body.messages?.map((message) => message.content || '').join('\n') || '';

    if (path === '/api/chat') {
      return new Response(JSON.stringify({
        message: {
          role: 'assistant',
          content: JSON.stringify({
            hooks: ['Open with a direct promise'],
            designCritique: ['Keep hierarchy simple and bold'],
            suggestions: ['Lead with one clear CTA'],
          }),
        },
        done: true,
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }

    const response =
      prompt.includes('Write a concise executive summary')
        ? 'Executive summary: the campaign shows clear direction and strong opportunities.'
        : JSON.stringify({
            painPoints: ['High acquisition costs'],
            angles: ['Speed and simplicity'],
            objections: ['Too expensive'],
            summary: 'Meta performance is healthy but needs more efficient conversion paths.',
            metrics: { ctr: 2.4, cpa: 38 },
            observations: ['Creative needs tighter messaging'],
          });

    return new Response(JSON.stringify({ response, done: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as FetchLike;
}

function restoreFetch() {
  globalThis.fetch = realFetch;
}

test('health endpoint returns ok', async () => {
  const mongoReady = await ensureMongoAvailable();
  if (!mongoReady) {
    return;
  }

  await resetDatabase();
  const { server, baseUrl } = await startServer();
  try {
    const body = await fetchJson(`${baseUrl}/health`);
    assert.equal(body.status, 'ok');
  } finally {
    server.close();
    await disconnectMongo();
  }
});

test('project create and list works', async () => {
  const mongoReady = await ensureMongoAvailable();
  if (!mongoReady) {
    return;
  }

  await resetDatabase();
  const { server, baseUrl } = await startServer();
  try {
    const created = await postJson(`${baseUrl}/api/v1/projects`, { name: 'Demo Project' });
    assert.ok(created.data && typeof created.data === 'object');

    const list = await fetchJson(`${baseUrl}/api/v1/projects`);
    assert.ok(Array.isArray(list.data));
    assert.equal((list.data as JsonValue[]).length, 1);
  } finally {
    server.close();
    await disconnectMongo();
  }
});

test('ollama-backed pipeline completes end-to-end', async () => {
  const mongoReady = await ensureMongoAvailable();
  if (!mongoReady) {
    return;
  }

  await resetDatabase();
  installOllamaMock();
  const { server, baseUrl } = await startServer();

  try {
    const project = await postJson(`${baseUrl}/api/v1/projects`, { name: 'Pipeline Demo', objective: 'Launch campaign' });
    const projectId = (project.data as JsonValue).id as string;

    const ingestion = await postJson(`${baseUrl}/api/v1/projects/${projectId}/ingestions`, {
      type: 'text',
      payload: { text: 'Customers want faster setup and lower costs.' },
    });
    const ingestionId = (ingestion.data as JsonValue).id as string;

    const normalization = await postJson(`${baseUrl}/api/v1/projects/${projectId}/normalizations`, {
      ingestionIds: [ingestionId],
    });
    const normalizedId = ((normalization.data as JsonValue).normalizedSources as JsonValue[])[0].id as string;

    const analysis = await postJson(`${baseUrl}/api/v1/projects/${projectId}/analyses`, {
      normalizedIds: [normalizedId],
    });
    const analysisId = ((analysis.data as JsonValue).analysis as JsonValue).id as string;

    await waitFor(() => fetchJson(`${baseUrl}/api/v1/analyses/${analysisId}`), (body) => (body.data as JsonValue).status === 'completed');

    const creative = await postJson(`${baseUrl}/api/v1/projects/${projectId}/creatives`, { analysisId });
    const creativeId = ((creative.data as JsonValue).creative as JsonValue).id as string;
    await waitFor(() => fetchJson(`${baseUrl}/api/v1/creatives/${creativeId}`), (body) => (body.data as JsonValue).status === 'completed');

    const report = await postJson(`${baseUrl}/api/v1/projects/${projectId}/reports`, {
      analysisId,
      creativeId,
    });
    const reportId = ((report.data as JsonValue).report as JsonValue).id as string;
    await waitFor(() => fetchJson(`${baseUrl}/api/v1/reports/${reportId}`), (body) => (body.data as JsonValue).status === 'completed');

    const download = await realFetch(`${baseUrl}/api/v1/reports/${reportId}/download`);
    assert.equal(download.status, 200);

    const jobs = await fetchJson(`${baseUrl}/api/v1/projects/${projectId}/jobs`);
    assert.ok(Array.isArray(jobs.data));
    assert.ok((jobs.data as JsonValue[]).length >= 3);
  } finally {
    restoreFetch();
    server.close();
    await disconnectMongo();
  }
});

async function waitFor(fetcher: () => Promise<JsonValue>, predicate: (body: JsonValue) => boolean) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const body = await fetcher();
    if (predicate(body)) return body;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  throw new Error('Timed out waiting for async pipeline completion.');
}
