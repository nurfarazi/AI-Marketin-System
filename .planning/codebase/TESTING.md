# Testing Patterns

**Analysis Date:** 2026-04-12

## Test framework

### Runner

- Node.js built-in test runner invoked through `npm test`, which expands to `node --import tsx --test test/**/*.test.ts` in `package.json`.

### Assertion library

- `node:assert/strict`.

### Run commands

```bash
npm test              # Run the TypeScript test suite under test/**/*.test.ts
npm run build         # Compile the backend TypeScript project
npm run web:build     # Build the Vite frontend as a verification step
```

## Test file organization

### Helper location

- Repository-level tests live in `test/`.
- The inspected test files are `test/app.test.ts` and `test/ollama-env.test.ts`; a parallel `test/app.test.js` file also exists in the workspace.

### Naming

- Test files use the `*.test.ts` pattern.
- Test names are short, behavior-focused sentences such as `health endpoint returns ok` and `ollama config rejects non-local base urls`.

### Structure

```text
test/
├── app.test.ts
├── app.test.js
└── ollama-env.test.ts
```

## Test structure

### Suite organization

- Tests are written with `test('...', async () => { ... })` from `node:test`.
- `test/app.test.ts` uses helper functions such as `startServer()`, `fetchJson()`, `postJson()`, `waitFor()`, and `waitForJobStatus()` to keep the integration flow readable.
- Long-running pipeline assertions are expressed as polling checks rather than fixed sleeps.

### Patterns

- Each integration test sets up a local MongoDB connection, starts an Express app on an ephemeral port, performs HTTP requests, and closes the server in a `finally` block.
- Tests seed environment variables at the top of the file when the process does not already provide them.

## Mocking

### Framework

- `globalThis.fetch` is monkeypatched directly in `test/app.test.ts` and `test/ollama-env.test.ts`.

### Pattern

```typescript
const realFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (async (input, init) => {
  // mock Ollama responses here
}) as typeof fetch;

try {
  // assertions
} finally {
  globalThis.fetch = realFetch;
}
```

### What to mock

- External Ollama HTTP calls are mocked so the tests can control model responses deterministically.

### What not to mock

- MongoDB is exercised against a real local database when available.
- The Express app is started normally through `createApp()`.

## Fixtures and factories

### Test data

- Test payloads are declared inline, especially in `test/app.test.ts` where the ingestion cases and Ollama normalization responses are defined as arrays.
- `installOllamaMock()` provides configurable mocked responses for creative, analysis, and normalization flows.

### Location

- Shared helpers live at the bottom of `test/app.test.ts`.

## Coverage

### Requirements

- No coverage script or coverage config was detected in `package.json` or the repository search results.

### View coverage

```bash
# Not configured in this repository
```

## Test types

### Unit tests

- `test/ollama-env.test.ts` verifies Ollama configuration defaults and safety checks without starting the API server.

### Integration tests

- `test/app.test.ts` exercises the `/health` endpoint, project creation/listing, ingestion normalization, analysis, creative generation, report generation, and report download flows.

### E2E tests

- No separate browser E2E test runner was detected in the repository config.
- The frontend currently has no test script in `web/package.json`.

## Common patterns

### Async testing

```typescript
async function waitFor(fetcher: () => Promise<JsonValue>, predicate: (body: JsonValue) => boolean) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const body = await fetcher();
    if (predicate(body)) return body;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  throw new Error('Timed out waiting for async pipeline completion.');
}
```

### Error testing

```typescript
await assert.rejects(() => generateText('Hello world'), /localhost|safety/i);
assert.match(String(failedSource.error ?? ''), /normalization/i);
```

## Verification approach

- Verification is typically performed with `npm test` for behavior checks and `npm run build` for TypeScript compilation.
- Integration tests depend on local MongoDB and mocked Ollama responses, so the suite skips or short-circuits when MongoDB is unavailable.

---

## Testing analysis

2026-04-12
