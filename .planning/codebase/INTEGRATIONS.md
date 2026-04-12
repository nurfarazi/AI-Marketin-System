# External Integrations

**Analysis Date:** 2026-04-12

## APIs & External Services

**LLM / AI:**

- Ollama is the only AI backend used by the app (`src/services/ollama.ts`)
  - SDK/Client: built-in `fetch` with JSON POSTs to `/api/generate` and `/api/chat`
  - Auth: none detected
  - Safety guard: `OLLAMA_BASE_URL` must resolve to localhost/loopback in `src/services/ollama.ts`
  - Used by: `src/services/normalization.ts`, `src/services/pipeline.ts`, `src/services/creative-generator.ts`, `src/services/report-generator.ts`

**Application API:**

- Express REST API mounted under `/api/v1` (`src/app.ts`, `src/routes/index.ts`)
  - Consumed by `web/src/api.ts` via `VITE_API_BASE_URL`
  - Request examples live in `docs/http/ai-marketing-system.http`

## Data Storage

**Databases:**

- MongoDB 7.0 is the persistence layer (`docker-compose.yml`, `src/db/mongo.ts`)
  - Connection: `MONGO_URI`
  - Database name: `MONGO_DB_NAME`
  - Client: `MongoClient` from `mongodb`
  - Collections: `projects`, `ingestions`, `normalized_sources`, `analyses`, `creatives`, `reports`, `jobs`
  - Indexes: unique `id` plus `projectId` lookups on the pipeline collections in `src/db/mongo.ts`

**File Storage:**

- No dedicated object store detected
- Report downloads are currently API placeholders: `GET /api/v1/reports/:reportId/download` returns text and `report.pdfUrl` points back to the API route (`src/routes/index.ts`)

**Caching:**

- None detected

## Authentication & Identity

**Auth Provider:**

- None detected
- `src/app.ts` applies CORS via `CORS_ORIGIN`, but no auth middleware, session layer, or token validation is present

## Monitoring & Observability

**Error Tracking:**

- None detected

**Logs:**

- Console-based logger in `src/utils/logger.ts`
- Log level is controlled by `LOG_LEVEL`
- `requestLogger` records method, URL, status code, and duration for every completed request
- `src/middleware/errors.ts` logs unhandled request errors before returning JSON responses

## CI/CD & Deployment

**Hosting:**

- Local/containerized deployment via `Dockerfile` and `docker-compose.yml`
- Backend container listens on `5011`; MongoDB container exposes `27017`
- Frontend is a separate Vite app in `web/` with its own build/preview scripts

**CI Pipeline:**

- None detected

## Environment Configuration

**Required env vars:**

- Backend: `PORT`, `LOG_LEVEL`, `CORS_ORIGIN`, `MONGO_URI`, `MONGO_DB_NAME`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_TEMPERATURE`
- Frontend: `VITE_API_BASE_URL`

**Secrets location:**

- Root `.env` is expected by `src/server.ts` and `docker-compose.yml`
- Frontend env values are expected in `web/.env`

## Webhooks & Callbacks

**Incoming:**

- None detected

**Outgoing:**

- None detected
- Async workflow steps are triggered internally with `setImmediate` in `src/routes/index.ts`, not through webhook callbacks

## Notable Integration Paths

- `src/server.ts` loads env vars, connects to MongoDB, ensures indexes, builds the Express app, and starts the HTTP server
- `src/routes/index.ts` queues jobs in MongoDB, then fans out to Ollama-backed normalization, analysis, creative, and report generation flows
- `web/src/App.tsx` polls the backend every 5 seconds through `web/src/api.ts`
- `docker-compose.yml` wires the app to MongoDB and maps Ollama through `host.docker.internal`

Integration audit: 2026-04-12
