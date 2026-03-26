import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { MongoClient } from 'mongodb';

type JsonValue = Record<string, unknown>;
type FetchLike = typeof fetch;
type OllamaMockOptions = {
  normalizationOutputs?: Array<string | Record<string, unknown>>;
};

const realFetch = globalThis.fetch.bind(globalThis);
const testEnv = {
  mongoUri: 'mongodb://127.0.0.1:27017',
  mongoDbName: 'ai_marketing_system_test',
  port: '5011',
  corsOrigin: '*',
  logLevel: 'info',
  ollamaBaseUrl: 'http://127.0.0.1:11434',
  ollamaModel: 'llama3.1',
  ollamaTemperature: '0.2',
};

if (!process.env.PORT) process.env.PORT = testEnv.port;
if (!process.env.CORS_ORIGIN) process.env.CORS_ORIGIN = testEnv.corsOrigin;
if (!process.env.LOG_LEVEL) process.env.LOG_LEVEL = testEnv.logLevel;
if (!process.env.OLLAMA_BASE_URL) process.env.OLLAMA_BASE_URL = testEnv.ollamaBaseUrl;
if (!process.env.OLLAMA_MODEL) process.env.OLLAMA_MODEL = testEnv.ollamaModel;
if (!process.env.OLLAMA_TEMPERATURE) process.env.OLLAMA_TEMPERATURE = testEnv.ollamaTemperature;
if (!process.env.MONGO_URI) process.env.MONGO_URI = testEnv.mongoUri;
if (!process.env.MONGO_DB_NAME) process.env.MONGO_DB_NAME = testEnv.mongoDbName;

const mongoUri = process.env.MONGO_URI;
const mongoDbName = process.env.MONGO_DB_NAME;

let createApp: typeof import('../src/app').createApp;
let connectToMongo: typeof import('../src/db/mongo').connectToMongo;
let disconnectMongo: typeof import('../src/db/mongo').disconnectMongo;
let createRepositories: typeof import('../src/repositories').createRepositories;

const dependenciesReady = (async () => {
  const appModule = await import('../src/app');
  const mongoModule = await import('../src/db/mongo');
  const repositoriesModule = await import('../src/repositories');

  createApp = appModule.createApp;
  connectToMongo = mongoModule.connectToMongo;
  disconnectMongo = mongoModule.disconnectMongo;
  createRepositories = repositoriesModule.createRepositories;
})();

async function startServer() {
  await dependenciesReady;
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

function installOllamaMock(options: OllamaMockOptions = {}) {
  const normalizationOutputs = [...(options.normalizationOutputs ?? [])];
  let normalizationAttempt = 0;
  globalThis.fetch = (async (input: Parameters<FetchLike>[0], init?: Parameters<FetchLike>[1]) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (!url.startsWith('http://127.0.0.1:11434/')) {
      return realFetch(input as Parameters<FetchLike>[0], init);
    }

    const path = new URL(url).pathname;
    const bodyText = typeof init?.body === 'string' ? init.body : '';
    const body = bodyText ? JSON.parse(bodyText) as { prompt?: string; messages?: Array<{ content?: string }> } : {};
    const prompt = body.prompt || body.messages?.map((message) => message.content || '').join('\n') || '';

    await new Promise((resolve) => setTimeout(resolve, 150));

    if (body?.prompt?.toLowerCase().includes('normalize source type:')) {
      const nextOutput = normalizationOutputs[normalizationAttempt] ?? {
        kind: 'normalized',
        sourceType: 'text',
        content: 'Normalized source content',
        summary: 'Normalized source summary',
        meta: { sourceType: 'text' },
      };
      normalizationAttempt += 1;
      const responseText = typeof nextOutput === 'string' ? nextOutput : JSON.stringify(nextOutput);
      return new Response(JSON.stringify({ response: responseText, done: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

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
    installOllamaMock({
      normalizationOutputs: [
        {
          kind: 'normalized',
          sourceType: 'text',
          content: 'Customers want faster setup and lower costs.',
          summary: 'Text review about faster setup and lower costs.',
          meta: { sourceType: 'text' },
        },
        {
          kind: 'normalized',
          sourceType: 'url',
          content: 'Landing page highlights example.com/product and product messaging.',
          summary: 'Product page with landing page copy.',
          meta: { sourceType: 'url' },
        },
        {
          kind: 'normalized',
          sourceType: 'image',
          content: 'Homepage screenshot shows a clear hero and CTA.',
          summary: 'Screenshot with clear visual hierarchy.',
          meta: { sourceType: 'image' },
        },
        {
          kind: 'normalized',
          sourceType: 'csv',
          content: 'Launch 01 drove 12000 impressions and 340 clicks.',
          summary: 'CSV export for Launch 01.',
          meta: { sourceType: 'csv' },
        },
      ],
    });
  const { server, baseUrl } = await startServer();

  try {
    const project = await postJson(`${baseUrl}/api/v1/projects`, { name: 'Pipeline Demo', objective: 'Launch campaign' });
    const projectId = (project.data as JsonValue).id as string;
    assert.equal((project.data as JsonValue).name, 'Pipeline Demo');

    const projectsList = await fetchJson(`${baseUrl}/api/v1/projects`);
    assert.equal((projectsList.data as JsonValue[]).length, 1);

    const sourceCases: Array<{
      type: 'text' | 'url' | 'image' | 'csv';
      payload: JsonValue;
      expectedContentFragment: string;
    }> = [
      {
        type: 'text',
        payload: { text: 'Customers want faster setup and lower costs.' },
        expectedContentFragment: 'faster setup and lower costs',
      },
      {
        type: 'url',
        payload: { url: 'https://example.com/product', title: 'Landing page' },
        expectedContentFragment: 'example.com/product',
      },
      {
        type: 'image',
        payload: { imageName: 'Homepage screenshot', imageUrl: 'https://example.com/screenshot.png' },
        expectedContentFragment: 'screenshot',
      },
      {
        type: 'csv',
        payload: { csvText: 'ad_name,impressions,clicks\nLaunch 01,12000,340' },
        expectedContentFragment: 'Launch 01',
      },
    ];

    const normalizedSources: JsonValue[] = [];
    for (const sourceCase of sourceCases) {
      const ingestion = await postJson(`${baseUrl}/api/v1/projects/${projectId}/ingestions`, {
        type: sourceCase.type,
        payload: sourceCase.payload,
      });
      const ingestionId = (ingestion.data as JsonValue).id as string;
      assert.equal((ingestion.data as JsonValue).status, 'received');

      const normalizedSource = await waitForNormalizedSource(baseUrl, projectId, ingestionId, 'completed');
      assert.equal(normalizedSource.ingestionId, ingestionId);
      assert.equal(normalizedSource.status, 'completed');
      assert.equal((normalizedSource.data as JsonValue).kind, 'normalized');
      assert.equal((normalizedSource.data as JsonValue).sourceType, sourceCase.type);
      assert.match(String((normalizedSource.data as JsonValue).content ?? ''), new RegExp(sourceCase.expectedContentFragment, 'i'));
      normalizedSources.push(normalizedSource);
    }

    const ingestionsList = await fetchJson(`${baseUrl}/api/v1/projects/${projectId}/ingestions`);
    assert.equal((ingestionsList.data as JsonValue[]).length, sourceCases.length);

    const jobsForNormalization = await waitFor(
      () => fetchJson(`${baseUrl}/api/v1/projects/${projectId}/jobs`),
      (body) => {
        const jobs = body.data as JsonValue[];
        return jobs.filter((job) => job.kind === 'normalization').length === sourceCases.length && jobs.filter((job) => job.kind === 'normalization').every((job) => job.status === 'completed');
      },
    );
    const normalizationJobs = (jobsForNormalization.data as JsonValue[]).filter((job) => job.kind === 'normalization');
    assert.equal(normalizationJobs.length, sourceCases.length);
    const normalizedId = normalizedSources[0].id as string;

    const analysis = await postJson(`${baseUrl}/api/v1/projects/${projectId}/analyses`, {
      normalizedIds: [normalizedId],
    });
    const analysisData = (analysis.data as JsonValue).analysis as JsonValue;
    const analysisJob = (analysis.data as JsonValue).job as JsonValue;
    const analysisId = analysisData.id as string;
    assert.equal(analysisJob.status, 'queued');
    await waitForJobStatus(baseUrl, analysisJob.id as string, 'running');
    await waitForJobStatus(baseUrl, analysisJob.id as string, 'completed');
    const fetchedAnalysis = await fetchJson(`${baseUrl}/api/v1/analyses/${analysisId}`);
    assert.equal((fetchedAnalysis.data as JsonValue).status, 'completed');
    assert.equal(((fetchedAnalysis.data as JsonValue).stages as JsonValue).insightExtraction, 'completed');
    assert.ok((fetchedAnalysis.data as JsonValue).result);

    const creative = await postJson(`${baseUrl}/api/v1/projects/${projectId}/creatives`, { analysisId });
    const creativeData = (creative.data as JsonValue).creative as JsonValue;
    const creativeJob = (creative.data as JsonValue).job as JsonValue;
    const creativeId = creativeData.id as string;
    assert.equal(creativeJob.status, 'queued');
    await waitForJobStatus(baseUrl, creativeJob.id as string, 'running');
    await waitForJobStatus(baseUrl, creativeJob.id as string, 'completed');
    const fetchedCreative = await fetchJson(`${baseUrl}/api/v1/creatives/${creativeId}`);
    assert.equal((fetchedCreative.data as JsonValue).status, 'completed');
    assert.ok((fetchedCreative.data as JsonValue).output);

    const report = await postJson(`${baseUrl}/api/v1/projects/${projectId}/reports`, {
      analysisId,
      creativeId,
    });
    const reportData = (report.data as JsonValue).report as JsonValue;
    const reportJob = (report.data as JsonValue).job as JsonValue;
    const reportId = reportData.id as string;
    assert.equal(reportJob.status, 'queued');
    await waitForJobStatus(baseUrl, reportJob.id as string, 'running');
    await waitForJobStatus(baseUrl, reportJob.id as string, 'completed');
    const fetchedReport = await fetchJson(`${baseUrl}/api/v1/reports/${reportId}`);
    assert.equal((fetchedReport.data as JsonValue).status, 'completed');
    assert.ok(typeof (fetchedReport.data as JsonValue).pdfUrl === 'string');

    const download = await realFetch(`${baseUrl}/api/v1/reports/${reportId}/download`);
    assert.equal(download.status, 200);
    assert.match(await download.text(), /PDF export placeholder/);

    const jobs = await fetchJson(`${baseUrl}/api/v1/projects/${projectId}/jobs`);
    assert.ok(Array.isArray(jobs.data));
    const jobsByKind = new Map((jobs.data as JsonValue[]).map((job) => [job.kind as string, job]));
    assert.ok(jobsByKind.has('normalization'));
    assert.ok(jobsByKind.has('analysis'));
    assert.ok(jobsByKind.has('creative'));
    assert.ok(jobsByKind.has('report'));
    for (const job of jobs.data as JsonValue[]) {
      assert.equal(job.status, 'completed');
    }
  } finally {
    restoreFetch();
    server.close();
    await disconnectMongo();
  }
});

test('ollama normalization retries once then fails for invalid output', async () => {
  const mongoReady = await ensureMongoAvailable();
  if (!mongoReady) {
    return;
  }

  await resetDatabase();
    installOllamaMock({
      normalizationOutputs: ['not json', 'still not json'],
    });
  const { server, baseUrl } = await startServer();

  try {
    const project = await postJson(`${baseUrl}/api/v1/projects`, { name: 'Normalization Retry Demo' });
    const projectId = (project.data as JsonValue).id as string;

    const ingestion = await postJson(`${baseUrl}/api/v1/projects/${projectId}/ingestions`, {
      type: 'text',
      payload: { text: 'This should fail normalization.' },
    });
    const ingestionId = (ingestion.data as JsonValue).id as string;

    const failedSource = await waitForNormalizedSource(baseUrl, projectId, ingestionId, 'failed');
    assert.equal(failedSource.status, 'failed');
    assert.match(String(failedSource.error ?? ''), /normalization/i);

    const jobs = await waitFor(
      () => fetchJson(`${baseUrl}/api/v1/projects/${projectId}/jobs`),
      (body) => {
        const normalizationJob = (body.data as JsonValue[]).find((job) => job.kind === 'normalization');
        return normalizationJob?.status === 'failed';
      },
    );
    const normalizationJob = (jobs.data as JsonValue[]).find((job) => job.kind === 'normalization') as JsonValue;
    assert.equal(normalizationJob.status, 'failed');
    assert.match(String(normalizationJob.error ?? ''), /invalid|normalize/i);
  } finally {
    restoreFetch();
    server.close();
    await disconnectMongo();
  }
});

async function waitFor(fetcher: () => Promise<JsonValue>, predicate: (body: JsonValue) => boolean) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const body = await fetcher();
    if (predicate(body)) return body;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  throw new Error('Timed out waiting for async pipeline completion.');
}

async function waitForJobStatus(baseUrl: string, jobId: string, desiredStatus: string) {
  return waitFor(
    () => fetchJson(`${baseUrl}/api/v1/jobs/${jobId}`),
    (body) => (body.data as JsonValue).status === desiredStatus,
  );
}

async function waitForNormalizedSource(baseUrl: string, projectId: string, ingestionId: string, desiredStatus: string) {
  const body = await waitFor(
    () => fetchJson(`${baseUrl}/api/v1/projects/${projectId}/normalizations`),
    (nextBody) => (nextBody.data as JsonValue[]).some((source) => source.ingestionId === ingestionId && source.status === desiredStatus),
  );

  const source = (body.data as JsonValue[]).find((item) => item.ingestionId === ingestionId && item.status === desiredStatus);
  if (!source) {
    throw new Error(`Timed out waiting for normalized source ${ingestionId} to become ${desiredStatus}.`);
  }

  return source as JsonValue;
}
