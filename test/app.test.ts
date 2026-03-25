import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app';

type JsonValue = Record<string, unknown>;

async function startServer() {
  const app = createApp();
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

test('health endpoint returns ok', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const body = await fetchJson(`${baseUrl}/health`);
    assert.equal(body.status, 'ok');
  } finally {
    server.close();
  }
});

test('project create and list works', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const created = await postJson(`${baseUrl}/api/v1/projects`, { name: 'Demo Project' });
    assert.ok(created.data && typeof created.data === 'object');

    const list = await fetchJson(`${baseUrl}/api/v1/projects`);
    assert.ok(Array.isArray(list.data));
    assert.equal((list.data as JsonValue[]).length, 1);
  } finally {
    server.close();
  }
});
