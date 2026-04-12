# Codebase Concerns

**Analysis Date:** 2026-04-12

## Maintainability risks

**Large mixed-responsibility files:**

- `web/src/App.tsx` is 908 lines and combines project state, polling, form handling, rendering, and download actions in one component.
- `src/routes/index.ts` is 601 lines and combines route registration with all job orchestration (`runNormalizationPipeline`, `runAnalysisPipeline`, `runCreativePipeline`, `runReportPipeline`).
- Impact: future changes in one flow are likely to touch multiple unrelated behaviors in the same file.

**Singleton repository wiring:**

- `src/repositories/index.ts` ignores its `db` argument and returns module singletons from `src/repositories/project-repository.ts` and `src/repositories/pipeline-repository.ts`.
- `src/db/mongo.ts` keeps `client` and `db` in module scope.
- Impact: repository behavior is tightly coupled to global process state, which makes isolation and future multi-connection support harder.

**Weak ID generation:**

- `src/utils/id.ts` uses `Math.random()` to build IDs.
- Impact: collisions are unlikely but possible; the Mongo unique indexes in `src/db/mongo.ts` will turn collisions into failed writes.

## Operational risks

**In-process background jobs:**

- `src/routes/index.ts` launches normalization, analysis, creative, and report work with `setImmediate(...)` after the HTTP response is accepted.
- There is no worker queue, retry coordinator, or recovery scan on startup in `src/server.ts`.
- Impact: jobs in flight can be lost if the process exits or restarts, and recovery depends on request-triggered code paths.

**No request timeout for Ollama calls:**

- `src/services/ollama.ts` uses `fetch(...)` for `/api/generate` and `/api/chat` without an abort signal or timeout.
- Impact: a slow or hung Ollama endpoint can leave background jobs waiting indefinitely.

**Hard startup dependency on environment variables:**

- `src/config/env.ts` throws when required variables are missing or malformed.
- `src/server.ts`, `src/app.ts`, `src/utils/logger.ts`, and `src/services/ollama.ts` all read required env values during startup/import.
- Impact: missing `PORT`, `CORS_ORIGIN`, `LOG_LEVEL`, `MONGO_URI`, `MONGO_DB_NAME`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, or `OLLAMA_TEMPERATURE` stops the app before it serves traffic.

## Missing safeguards

**Cross-project record mixing is not checked:**

- `POST /api/v1/projects/:projectId/normalizations` in `src/routes/index.ts` accepts `ingestionIds` and queues any matching records returned by `ingestions.getById(...)` without verifying `ingestion.projectId === projectId`.
- `POST /api/v1/projects/:projectId/analyses` does the same for `normalizedIds`.
- `POST /api/v1/projects/:projectId/reports` accepts `analysisId` and `creativeId` without verifying ownership.
- Impact: records from one project can be used to build jobs for another project.

**No authentication or authorization middleware:**

- `src/app.ts` mounts request logging, JSON parsing, `/health`, the API router, and error handlers only.
- Impact: every API route is publicly reachable as implemented.

**Model failures can be silently flattened into empty output:**

- `src/services/pipeline.ts` returns default empty objects/arrays when `generateJson(...)` returns `null` or when creative JSON parsing fails.
- `src/services/normalizers.ts` returns `null` for invalid input shapes without surfacing a structured error.
- Impact: malformed Ollama output can look like a completed run with sparse content instead of a visible failure.

## Incomplete areas

**Report download is a placeholder:**

- `GET /api/v1/reports/:reportId/download` in `src/routes/index.ts` returns `text/plain` placeholder content instead of a PDF binary.
- `web/src/App.tsx` labels the export as a placeholder and downloads it as `report-<id>.txt`.
- Impact: the report workflow is not a real file export yet, even though the API advertises a download URL.

**Polling reads the full workspace repeatedly:**

- `web/src/App.tsx` refreshes the selected project bundle every 5 seconds with seven API calls in `loadBundle()` / `refreshActiveProject()`.
- `src/repositories/pipeline-repository.ts` returns full collections for each `list*` method with no pagination or limits.
- Impact: dashboard traffic and payload sizes grow linearly with data volume.

## Test coverage gaps

**Tests cover the happy path more than the guardrails:**

- `test/app.test.ts` covers health, project creation/listing, the end-to-end Ollama pipeline, and one normalization retry failure case.
- There are no tests for project ownership validation, auth behavior, startup failure modes, report download content, Ollama timeout behavior, or CORS handling.
- Impact: several of the risks above are not exercised by the current test suite.

---

Concerns audit: 2026-04-12
