"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const mongodb_1 = require("mongodb");
const app_1 = require("../src/app");
const mongo_1 = require("../src/db/mongo");
const repositories_1 = require("../src/repositories");
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
if (!process.env.PORT)
    process.env.PORT = testEnv.port;
if (!process.env.CORS_ORIGIN)
    process.env.CORS_ORIGIN = testEnv.corsOrigin;
if (!process.env.LOG_LEVEL)
    process.env.LOG_LEVEL = testEnv.logLevel;
if (!process.env.OLLAMA_BASE_URL)
    process.env.OLLAMA_BASE_URL = testEnv.ollamaBaseUrl;
if (!process.env.OLLAMA_MODEL)
    process.env.OLLAMA_MODEL = testEnv.ollamaModel;
if (!process.env.OLLAMA_TEMPERATURE)
    process.env.OLLAMA_TEMPERATURE = testEnv.ollamaTemperature;
if (!process.env.MONGO_URI)
    process.env.MONGO_URI = testEnv.mongoUri;
if (!process.env.MONGO_DB_NAME)
    process.env.MONGO_DB_NAME = testEnv.mongoDbName;
const mongoUri = process.env.MONGO_URI;
const mongoDbName = process.env.MONGO_DB_NAME;
async function startServer() {
    const { db } = await (0, mongo_1.connectToMongo)();
    const app = (0, app_1.createApp)((0, repositories_1.createRepositories)(db));
    const server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    return { server, baseUrl };
}
async function fetchJson(url) {
    const response = await fetch(url);
    return response.json();
}
async function postJson(url, body) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
    return response.json();
}
async function ensureMongoAvailable() {
    const client = new mongodb_1.MongoClient(mongoUri, { serverSelectionTimeoutMS: 2000 });
    try {
        await client.connect();
        await client.db(mongoDbName).command({ ping: 1 });
        return true;
    }
    catch {
        return false;
    }
    finally {
        await client.close().catch(() => undefined);
    }
}
async function resetDatabase() {
    const client = new mongodb_1.MongoClient(mongoUri, { serverSelectionTimeoutMS: 2000 });
    try {
        await client.connect();
        await client.db(mongoDbName).dropDatabase();
    }
    finally {
        await client.close().catch(() => undefined);
    }
}
function installOllamaMock() {
    globalThis.fetch = (async (input, init) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (!url.startsWith('http://127.0.0.1:11434/')) {
            return realFetch(input, init);
        }
        const path = new URL(url).pathname;
        const bodyText = typeof init?.body === 'string' ? init.body : '';
        const body = bodyText ? JSON.parse(bodyText) : {};
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
        const response = prompt.includes('Write a concise executive summary')
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
    });
}
function restoreFetch() {
    globalThis.fetch = realFetch;
}
(0, node_test_1.default)('health endpoint returns ok', async () => {
    const mongoReady = await ensureMongoAvailable();
    if (!mongoReady) {
        return;
    }
    await resetDatabase();
    const { server, baseUrl } = await startServer();
    try {
        const body = await fetchJson(`${baseUrl}/health`);
        strict_1.default.equal(body.status, 'ok');
    }
    finally {
        server.close();
        await (0, mongo_1.disconnectMongo)();
    }
});
(0, node_test_1.default)('project create and list works', async () => {
    const mongoReady = await ensureMongoAvailable();
    if (!mongoReady) {
        return;
    }
    await resetDatabase();
    const { server, baseUrl } = await startServer();
    try {
        const created = await postJson(`${baseUrl}/api/v1/projects`, { name: 'Demo Project' });
        strict_1.default.ok(created.data && typeof created.data === 'object');
        const list = await fetchJson(`${baseUrl}/api/v1/projects`);
        strict_1.default.ok(Array.isArray(list.data));
        strict_1.default.equal(list.data.length, 1);
    }
    finally {
        server.close();
        await (0, mongo_1.disconnectMongo)();
    }
});
(0, node_test_1.default)('ollama-backed pipeline completes end-to-end', async () => {
    const mongoReady = await ensureMongoAvailable();
    if (!mongoReady) {
        return;
    }
    await resetDatabase();
    installOllamaMock();
    const { server, baseUrl } = await startServer();
    try {
        const project = await postJson(`${baseUrl}/api/v1/projects`, { name: 'Pipeline Demo', objective: 'Launch campaign' });
        const projectId = project.data.id;
        const ingestion = await postJson(`${baseUrl}/api/v1/projects/${projectId}/ingestions`, {
            type: 'text',
            payload: { text: 'Customers want faster setup and lower costs.' },
        });
        const ingestionId = ingestion.data.id;
        const normalization = await postJson(`${baseUrl}/api/v1/projects/${projectId}/normalizations`, {
            ingestionIds: [ingestionId],
        });
        const normalizedId = normalization.data.normalizedSources[0].id;
        const analysis = await postJson(`${baseUrl}/api/v1/projects/${projectId}/analyses`, {
            normalizedIds: [normalizedId],
        });
        const analysisId = analysis.data.analysis.id;
        await waitFor(() => fetchJson(`${baseUrl}/api/v1/analyses/${analysisId}`), (body) => body.data.status === 'completed');
        const creative = await postJson(`${baseUrl}/api/v1/projects/${projectId}/creatives`, { analysisId });
        const creativeId = creative.data.creative.id;
        await waitFor(() => fetchJson(`${baseUrl}/api/v1/creatives/${creativeId}`), (body) => body.data.status === 'completed');
        const report = await postJson(`${baseUrl}/api/v1/projects/${projectId}/reports`, {
            analysisId,
            creativeId,
        });
        const reportId = report.data.report.id;
        await waitFor(() => fetchJson(`${baseUrl}/api/v1/reports/${reportId}`), (body) => body.data.status === 'completed');
        const download = await realFetch(`${baseUrl}/api/v1/reports/${reportId}/download`);
        strict_1.default.equal(download.status, 200);
        const jobs = await fetchJson(`${baseUrl}/api/v1/projects/${projectId}/jobs`);
        strict_1.default.ok(Array.isArray(jobs.data));
        strict_1.default.ok(jobs.data.length >= 3);
    }
    finally {
        restoreFetch();
        server.close();
        await (0, mongo_1.disconnectMongo)();
    }
});
async function waitFor(fetcher, predicate) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
        const body = await fetcher();
        if (predicate(body))
            return body;
        await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error('Timed out waiting for async pipeline completion.');
}
