# Architecture

**Analysis Date:** 2026-04-12

## Pattern Overview

**Overall:** Thin Express API + React dashboard + MongoDB persistence + local Ollama-backed async pipeline.

**Key Characteristics:**

- `src/server.ts` bootstraps the API, connects MongoDB, builds repositories, and starts the HTTP server.
- `src/routes/index.ts` owns request validation, job creation, and workflow orchestration for normalization, analysis, creative generation, and report generation.
- `web/src/App.tsx` provides a single-page operator console that drives the API and polls job-backed project state.

## Layers

**Frontend UI:**

- Purpose: Capture projects and sources, trigger pipeline stages, and display the latest artifacts.
- Location: `web/src/App.tsx`, `web/src/api.ts`, `web/src/main.tsx`
- Contains: React UI, API client, local storage helpers, dashboard state.
- Depends on: REST endpoints under `/api/v1`, browser `fetch`, `VITE_API_BASE_URL`.
- Used by: Human operators running the workflow in the browser.

**HTTP Application Shell:**

- Purpose: Configure Express middleware and expose health and API routing.
- Location: `src/app.ts`
- Contains: CORS header middleware, JSON/body parsing, `/health`, router mounting, 404/error handlers.
- Depends on: `src/routes/index.ts`, `src/middleware/errors.ts`, `src/utils/logger.ts`, `src/config/env.ts`.
- Used by: `src/server.ts` and the test harness in `test/app.test.ts`.

**API Routes and Orchestration:**

- Purpose: Validate requests, create records, and coordinate background pipeline stages.
- Location: `src/routes/index.ts`
- Contains: Project, ingestion, normalization, analysis, creative, report, and job routes plus async pipeline helpers.
- Depends on: `src/services/*.ts`, `src/repositories/index.ts`, `src/utils/id.ts`, `src/types.ts`.
- Used by: Express app mounted at `/api/v1`.

**Persistence:**

- Purpose: Store domain records in MongoDB collections.
- Location: `src/db/mongo.ts`, `src/repositories/project-repository.ts`, `src/repositories/pipeline-repository.ts`
- Contains: Mongo client setup, collection helpers, index creation, CRUD wrappers.
- Depends on: `MONGO_URI`, `MONGO_DB_NAME`, `mongodb`.
- Used by: Repository factory in `src/repositories/index.ts`, tests, and route handlers.

**Workflow Services:**

- Purpose: Normalize inputs and generate AI outputs.
- Location: `src/services/normalization.ts`, `src/services/pipeline.ts`, `src/services/creative-generator.ts`, `src/services/report-generator.ts`, `src/services/ollama.ts`
- Contains: Ollama request wrappers, normalization prompt handling, analysis pipeline, creative concept generation, report narrative generation.
- Depends on: `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_TEMPERATURE`.
- Used by: Route-level pipeline functions in `src/routes/index.ts`.

**Shared Types and Utilities:**

- Purpose: Keep record shapes, IDs, logging, and env parsing consistent.
- Location: `src/types.ts`, `src/utils/id.ts`, `src/utils/logger.ts`, `src/config/env.ts`
- Contains: Domain types, job/status unions, ID generation, structured logger, environment readers.
- Depends on: Node runtime and process environment.
- Used by: Most backend modules.

## Data Flow

**Request to artifact flow:**

1. The browser UI in `web/src/App.tsx` calls the API client in `web/src/api.ts`.
2. Express receives the request in `src/app.ts`, applies CORS, logging, and body parsing, then forwards it to `src/routes/index.ts`.
3. Route handlers validate the payload, load the project through repository methods, and create domain records such as `Project`, `Ingestion`, `NormalizedSource`, `Analysis`, `Creative`, `Report`, and `Job`.
4. Background work is scheduled with `setImmediate(...)` from `src/routes/index.ts`, so normalization and downstream stages run asynchronously after the HTTP response is returned.
5. Normalization uses `normalizeIngestionWithOllama()` from `src/services/normalization.ts` to transform raw ingestion payloads into the shared normalized schema.
6. Analysis uses `runFullPipeline()` from `src/services/pipeline.ts`, which runs insight extraction, performance analysis, and creative analysis against completed normalized sources.
7. Creative generation uses `generateCreativeConcepts()` from `src/services/creative-generator.ts` and consumes analysis results.
8. Report generation uses `generateReportNarrative()` from `src/services/report-generator.ts`; the completed report stores a download URL that maps to `GET /api/v1/reports/:reportId/download`.

**State management:**

- Persistent state lives in MongoDB collections.
- Job records in `src/types.ts` model asynchronous processing status with `queued`, `running`, `completed`, and `failed` states.
- The browser keeps only UI state and the active project id in local storage.

## Key Abstractions

**Project:**

- Purpose: Top-level client engagement container.
- Examples: `src/types.ts`, `src/routes/index.ts`, `web/src/types.ts`
- Pattern: All artifacts are scoped to a project id.

**Ingestion:**

- Purpose: Capture raw source material.
- Examples: `src/types.ts`, `src/routes/index.ts`
- Pattern: Accepts `url`, `text`, `image`, or `csv` payloads and starts normalization automatically.

**NormalizedSource:**

- Purpose: Shared, analysis-ready representation of an ingestion.
- Examples: `src/types.ts`, `src/services/normalization.ts`, `src/routes/index.ts`
- Pattern: Stores normalized content plus metadata and processing status.

**Analysis:**

- Purpose: Aggregate insight, performance, and creative analysis results.
- Examples: `src/types.ts`, `src/routes/index.ts`, `src/services/pipeline.ts`
- Pattern: Stores stage-by-stage progress and a combined pipeline result.

**Creative:**

- Purpose: Hold generated ad concepts and recommendations.
- Examples: `src/types.ts`, `src/routes/index.ts`, `src/services/creative-generator.ts`
- Pattern: Tied to a job and optionally linked to an analysis.

**Report:**

- Purpose: Final executive summary artifact.
- Examples: `src/types.ts`, `src/routes/index.ts`, `src/services/report-generator.ts`
- Pattern: Stores summary text and a placeholder PDF download URL.

**Job:**

- Purpose: Track asynchronous execution for each stage.
- Examples: `src/types.ts`, `src/routes/index.ts`
- Pattern: Route handlers create jobs before launching work and persist state transitions through repository updates.

## Entry Points

**API startup:**

- Location: `src/server.ts`
- Triggers: `npm run dev`, `npm start`, or the test harness.
- Responsibilities: Connect to MongoDB, ensure indexes, create repositories, mount the app, and handle shutdown.

**HTTP app creation:**

- Location: `src/app.ts`
- Triggers: `src/server.ts` and `test/app.test.ts`.
- Responsibilities: Assemble middleware and route wiring.

**Frontend startup:**

- Location: `web/src/main.tsx`
- Triggers: Vite dev server and build output.
- Responsibilities: Mount the React app into `#root`.

## Error Handling

**Strategy:**

- Route handlers use a `safe(...)` wrapper in `src/routes/index.ts` to catch promise rejections and translate repository failures into JSON responses.
- `src/middleware/errors.ts` provides a 404 handler and a generic error handler with structured logging.

**Patterns:**

- Validation failures return `400` with a JSON `{ error: ... }` body.
- Missing resources return `404`.
- Mongo-related failures are surfaced as `503` in the route helper.
- Unhandled errors are logged through `src/utils/logger.ts`.

## Cross-Cutting Concerns

**Logging:** `src/utils/logger.ts` implements scoped console logging with `LOG_LEVEL` gating and request duration logging.

**Validation:** `src/routes/index.ts` performs inline request validation with small type guards and `typeof` checks.

**Authentication:** Not detected. No auth middleware, session layer, or token validation is present in `src/app.ts` or `src/routes/index.ts`.

**Configuration:** Environment readers in `src/config/env.ts` and `src/services/ollama.ts` enforce required runtime values and safe Ollama localhost access.

---

Architecture analysis: 2026-04-12
