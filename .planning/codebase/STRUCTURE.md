# Codebase Structure

**Analysis Date:** 2026-04-12

## Directory Layout

```text
ai-marketing-system/
├── src/                 # Backend API, repositories, services, middleware, utilities
├── web/                 # React dashboard built with Vite
├── test/                # Node test suite for API and Ollama behavior
├── docs/                # Reference documentation and HTTP examples
├── output/              # Generated artifacts from browser/smoke runs
├── .planning/           # Generated planning and codebase-map documents
├── dist/                # Compiled backend output from `npm run build`
├── docker-compose.yml   # Local MongoDB + API composition
├── Dockerfile           # Backend container build
├── package.json         # Backend scripts and dependencies
├── README.md            # Runtime and setup instructions
└── tmp_playwright_smoke.cjs  # Standalone Playwright smoke script
```

## Directory Purposes

**`src/`:**

- Purpose: Backend implementation for the API and pipeline.
- Contains: Express app setup, route handlers, MongoDB access, AI pipeline services, logging, config helpers, and shared domain types.
- Key files: `src/server.ts`, `src/app.ts`, `src/routes/index.ts`, `src/services/pipeline.ts`, `src/db/mongo.ts`, `src/types.ts`.

**`web/`:**

- Purpose: Frontend dashboard for operating the pipeline.
- Contains: Vite app, React UI, browser API client, styles, and frontend-specific TypeScript config.
- Key files: `web/src/App.tsx`, `web/src/api.ts`, `web/src/main.tsx`, `web/src/types.ts`, `web/vite.config.ts`.

**`test/`:**

- Purpose: Automated Node test coverage for the backend and Ollama integration behavior.
- Contains: API tests and environment-safety checks.
- Key files: `test/app.test.ts`, `test/ollama-env.test.ts`, `test/app.test.js`.

**`docs/`:**

- Purpose: Human-readable workflow notes and API examples.
- Contains: high-level documentation and HTTP request samples.
- Key files: `docs/ai-marketing-system-detailed-documentation.md`, `docs/http/ai-marketing-system.http`, `docs/mongo-examples-curl.md`.

**`output/`:**

- Purpose: Generated output artifacts.
- Contains: Playwright run output and other scratch artifacts.
- Key files: `output/playwright/`.

**`.planning/`:**

- Purpose: Generated planning artifacts consumed by GSD workflows.
- Contains: codebase maps and other planning documents.
- Key files: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`.

**`dist/`:**

- Purpose: Compiled backend JavaScript emitted by TypeScript.
- Contains: build output only.
- Key files: generated files under `dist/`.

## Key File Locations

**Entry Points:**

- `src/server.ts`: Starts the API, connects MongoDB, creates repositories, and installs shutdown handlers.
- `src/app.ts`: Builds the Express application and mounts middleware/routes.
- `web/src/main.tsx`: Bootstraps the React dashboard.
- `web/vite.config.ts`: Configures the frontend dev server and build output.

**Configuration:**

- `package.json`: Backend scripts, dependencies, and Node engine requirement.
- `web/package.json`: Frontend scripts and Vite/React dependencies.
- `tsconfig.json`: Backend TypeScript compiler settings.
- `web/tsconfig.json`, `web/tsconfig.node.json`: Frontend TypeScript settings.
- `docker-compose.yml`: Local container wiring and environment values.
- `Dockerfile`: Backend container build steps.
- `.env.example`: Required runtime environment variables.

**Core Logic:**

- `src/routes/index.ts`: All API routes and background workflow orchestration.
- `src/services/normalization.ts`: Normalization prompt and validation.
- `src/services/pipeline.ts`: Analysis pipeline stage fan-out.
- `src/services/creative-generator.ts`: Creative concept generation.
- `src/services/report-generator.ts`: Executive summary generation.
- `src/services/ollama.ts`: Ollama client and safety checks.
- `src/repositories/project-repository.ts`: Project persistence.
- `src/repositories/pipeline-repository.ts`: Ingestion, normalization, analysis, creative, report, and job persistence.

**Testing:**

- `test/app.test.ts`: End-to-end API and workflow tests.
- `test/ollama-env.test.ts`: Ollama configuration and safety tests.
- `tmp_playwright_smoke.cjs`: Browser smoke path covering the dashboard flow.

## Naming Conventions

**Files:**

- Backend modules use lowercase names with hyphens for multi-word files, such as `project-repository.ts` and `report-generator.ts`.
- Route and index aggregation files use `index.ts` in their directory.
- Frontend UI entry files use React conventions such as `App.tsx` and `main.tsx`.

**Directories:**

- Functional grouping by concern is used in `src/` (`config/`, `db/`, `middleware/`, `repositories/`, `routes/`, `services/`, `utils/`).
- Frontend code stays under `web/src/`.

## Where to Add New Code

**New feature:**

- Primary code: `src/routes/`, `src/services/`, and `src/repositories/` for backend work.
- Tests: `test/` for Node API tests and `tmp_playwright_smoke.cjs` or a new browser spec for dashboard flows.

**New component/module:**

- Implementation: `web/src/` for UI features, with shared API calls in `web/src/api.ts` and shared types in `web/src/types.ts`.

**Utilities:**

- Shared helpers: `src/utils/`.
- Environment parsing and runtime config: `src/config/`.

**New persistence logic:**

- Implementation: `src/repositories/project-repository.ts` or `src/repositories/pipeline-repository.ts` depending on the entity family.
- Mongo plumbing: `src/db/mongo.ts`.

## Special Directories

**`dist/`:**

- Purpose: Generated backend build output.
- Generated: Yes
- Committed: No

**`output/`:**

- Purpose: Generated smoke-test and browser artifacts.
- Generated: Yes
- Committed: Not part of the runtime source path.

**`src/store.ts`:**

- Purpose: In-memory store helper that mirrors the domain shapes.
- Generated: No
- Committed: Yes
- Runtime status: Not referenced by the main server bootstrap or route layer.

**`.planning/codebase/`:**

- Purpose: Architecture and structure maps for GSD planning flows.
- Generated: Yes
- Committed: Depends on repository policy.

---

Structure analysis: 2026-04-12
