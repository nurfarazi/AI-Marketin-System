const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const API_BASE = 'http://127.0.0.1:3000';
const WEB_BASE = 'http://127.0.0.1:3000';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const projectName = `Playwright Smoke ${stamp}`;
const clientName = `QA ${stamp}`;
const objective = `Verify the full dashboard flow ${stamp}`;
const feedbackText = `Customers need clearer pricing and faster setup ${stamp}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(pathname, init = {}) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
    ...init,
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${pathname}: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`);
  }

  return payload?.data ?? payload;
}

async function waitFor(check, description, timeoutMs = 120000, intervalMs = 1000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const value = await check();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(intervalMs);
  }

  const suffix = lastError ? ` Last error: ${lastError.message}` : '';
  throw new Error(`Timed out waiting for ${description}.${suffix}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1600, height: 1200 } });
  const page = await context.newPage();
  const consoleErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(`console: ${msg.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    consoleErrors.push(`pageerror: ${error.message}`);
  });

  await context.addInitScript(({ apiBaseUrl }) => {
    localStorage.setItem('ai-marketing-web-base-url', apiBaseUrl);
    localStorage.removeItem('ai-marketing-web-active-project-id');
  }, { apiBaseUrl: API_BASE });

  await page.goto(WEB_BASE, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('API base URL').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText(/online at http:\/\/127\.0\.0\.1:3000/i).waitFor({ state: 'visible', timeout: 15000 });

  await page.getByLabel('API base URL').fill(API_BASE);
  await page.getByRole('button', { name: 'Save URL' }).click();
  await page.getByText(/API endpoint saved/i).waitFor({ state: 'visible', timeout: 15000 });

  await page.getByLabel('Project name').fill(projectName);
  await page.getByLabel('Client name').fill(clientName);
  await page.getByLabel('Objective').fill(objective);
  await page.getByRole('button', { name: 'Create project' }).click();

  const project = await waitFor(async () => {
    const projects = await requestJson('/api/v1/projects');
    return projects.find((item) => item.name === projectName) || null;
  }, 'created project');

  await page.locator('.project-card--active', { hasText: projectName }).waitFor({ state: 'visible', timeout: 15000 });
  assert.match((await page.locator('.hero').textContent()) || '', new RegExp(projectName));

  await page.getByLabel('Customer feedback').fill(feedbackText);
  await page.getByRole('button', { name: 'Create ingestion' }).click();

  const ingestion = await waitFor(async () => {
    const ingestions = await requestJson(`/api/v1/projects/${project.id}/ingestions`);
    return ingestions.find((item) => item.payload && item.payload.text === feedbackText) || null;
  }, 'ingestion persistence');

  await page.getByRole('button', { name: 'Normalize all' }).click();
  const normalization = await waitFor(async () => {
    const normalized = await requestJson(`/api/v1/projects/${project.id}/normalizations`);
    return normalized.find((item) => item.ingestionId === ingestion.id && item.status === 'completed') || null;
  }, 'normalization completion');

  await page.getByRole('button', { name: 'Sync workspace' }).click();
  await page.locator('.metrics-grid .metric-card').first().waitFor({ state: 'visible', timeout: 15000 });

  await page.getByRole('button', { name: 'Analyze' }).click();
  const analysis = await waitFor(async () => {
    const analyses = await requestJson(`/api/v1/projects/${project.id}/analyses`);
    return analyses.find((item) => item.status === 'completed' && item.inputNormalizedIds?.includes(normalization.id)) || null;
  }, 'analysis completion', 180000, 1500);

  assert.ok(analysis.result?.insights?.painPoints?.length > 0, 'analysis should produce pain points');
  assert.ok(analysis.result?.insights?.angles?.length > 0, 'analysis should produce angles');

  await page.getByRole('button', { name: 'Sync workspace' }).click();
  await page.getByRole('button', { name: 'Generate creative' }).click();
  const creative = await waitFor(async () => {
    const creatives = await requestJson(`/api/v1/projects/${project.id}/creatives`);
    return creatives.find((item) => item.status === 'completed' && item.analysisId === analysis.id) || null;
  }, 'creative completion', 180000, 1500);

  assert.ok(Array.isArray(creative.output?.concepts) && creative.output.concepts.length > 0, 'creative should produce concepts');

  await page.getByRole('button', { name: 'Sync workspace' }).click();
  await page.getByRole('button', { name: 'Build report' }).click();
  const report = await waitFor(async () => {
    const reports = await requestJson(`/api/v1/projects/${project.id}/reports`);
    return reports.find((item) => item.status === 'completed' && item.analysisId === analysis.id && item.creativeId === creative.id) || null;
  }, 'report completion', 180000, 1500);

  assert.ok(report.pdfUrl, 'report should have a download URL');

  await page.getByRole('button', { name: 'Sync workspace' }).click();
  const metricValues = await page.locator('.metric-card strong').allTextContents();
  assert.deepEqual(metricValues, ['1', '1', '1', '1', '1', '4']);

  const jobRows = await page.locator('.job-row').allTextContents();
  assert.ok(jobRows.some((text) => text.includes('normalization')));
  assert.ok(jobRows.some((text) => text.includes('analysis')));
  assert.ok(jobRows.some((text) => text.includes('creative')));
  assert.ok(jobRows.some((text) => text.includes('report')));
  assert.ok(jobRows.every((text) => text.includes('completed')));

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download report' }).click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /^report-.*\.txt$/);

  const downloadPath = await download.path();
  if (downloadPath) {
    const content = await fs.readFile(downloadPath, 'utf8');
    assert.match(content, new RegExp(report.id));
  }

  const screenshotDir = path.join(process.cwd(), 'output', 'playwright');
  await fs.mkdir(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, 'full-flow-dashboard.png'), fullPage: true });

  if (consoleErrors.length > 0) {
    throw new Error(`Browser console/page errors detected:\n${consoleErrors.join('\n')}`);
  }

  console.log(JSON.stringify({
    projectId: project.id,
    ingestionId: ingestion.id,
    normalizationId: normalization.id,
    analysisId: analysis.id,
    creativeId: creative.id,
    reportId: report.id,
    screenshot: path.join('output', 'playwright', 'full-flow-dashboard.png'),
  }, null, 2));

  await browser.close();
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
