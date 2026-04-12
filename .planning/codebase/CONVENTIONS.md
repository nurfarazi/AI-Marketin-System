# Coding Conventions

**Analysis Date:** 2026-04-12

## Naming patterns

### Files

- Backend files use lower kebab-case names in `src/config/`, `src/db/`, `src/middleware/`, `src/repositories/`, `src/services/`, and `src/utils/`.
- Frontend entry files use standard Vite/React names such as `web/src/App.tsx` and `web/src/main.tsx`.

### Functions

- CamelCase is used for helpers, factories, and route handlers such as `createApp`, `createRepositories`, `readTrimmedEnv`, `runFullPipeline`, and `createLogger`.
- Small private helpers are preferred for parsing, normalization, and formatting work.

### Variables

- Lower camelCase is used for locals and parameters.
- Upper snake case is used for constants such as `DEFAULT_BASE_URL`, `DEFAULT_MODEL`, `COLLECTIONS`, and `STORAGE_KEYS`.

### Types

- PascalCase is used for exported type aliases and structured models such as `Project`, `JobStatus`, `OllamaConfig`, `DashboardBundle`, and `ApiError`.
- Discriminated unions are used for status and kind fields across the domain types in `src/types.ts` and `web/src/types.ts`.

## Code style

### Formatting

- TypeScript is compiled with `strict: true` in `tsconfig.json`.
- The codebase consistently uses single quotes, semicolons, and 2-space indentation in the observed `.ts` and `.tsx` files.
- Function bodies are kept small and tend to use early returns instead of nested branching.

### Linting

- No ESLint, Prettier, or Biome config files were detected in the repository root or workspace search results.
- No lint script is defined in `package.json`.

## Import organization

### Order

1. External packages first, such as `express`, `mongodb`, `react`, `node:test`, and `node:assert/strict`.
2. Internal relative imports next, grouped by feature area when practical.
3. `import type` is used for type-only dependencies instead of runtime imports when possible.

### Path aliases

- No path alias configuration was detected in `tsconfig.json`; imports use relative paths.

## Error handling

- Environment readers in `src/config/env.ts` throw descriptive errors when required values are missing or invalid.
- `src/services/ollama.ts` rejects non-local Ollama base URLs and wraps network and HTTP failures in descriptive `Error` messages.
- `src/routes/index.ts` wraps async route handlers with `safe()` and maps repository/database failures through `handleRepositoryError()`.
- Route handlers return JSON errors with explicit HTTP status codes for validation failures, missing resources, and blocked operations such as an unavailable report download.
- `web/src/api.ts` wraps non-OK responses in `ApiError` and preserves the HTTP status plus response payload.

## Logging

### Framework

- Custom logging lives in `src/utils/logger.ts`; the codebase does not use a third-party logging package.

### Patterns

- Log levels are `error`, `warn`, `info`, and `debug`, and the level is controlled by `LOG_LEVEL`.
- Log output includes an ISO timestamp, an emoji per level, the uppercase level name, and an optional scope prefix.
- `requestLogger` logs method, URL, status code, and duration after the response finishes.
- Startup, shutdown, and fatal boot errors are logged through `logger` in `src/server.ts`.

## Comments

- The codebase relies more on explicit names and small helpers than on explanatory comments.
- No JSDoc or TSDoc convention was detected in the inspected files.

## Function design

### Size

- Functions are generally short and single-purpose, especially in `src/services/*`, `src/repositories/*`, and `web/src/App.tsx`.
- Request handlers are composed from helper functions instead of embedding all logic inline.

### Parameters

- Functions typically accept plain objects, primitive IDs, or typed payloads rather than framework-specific abstractions.
- Route handlers receive `Request` and `Response` directly and return JSON responses or early status codes.

### Return values

- Service helpers return structured objects or nullable results rather than mutating shared state.
- Repository methods usually return the created record, a fetched record, or `null` after update/retrieval operations.

## Module design

### Exports

- Modules generally export one focused class instance, factory function, or type bundle.
- `src/repositories/index.ts` composes repository adapters into a `Repositories` object for dependency injection into `createApp()`.
- `web/src/api.ts` centralizes API access behind a single `createApiClient()` factory and a custom `ApiError` class.

### Barrel files

- `src/repositories/index.ts` acts as a composition module for repository wiring.
- No broad barrel-file pattern was detected elsewhere in the inspected code.

## Frontend patterns

- `web/src/App.tsx` uses function components, React hooks, and local helper functions declared alongside the page component.
- UI helpers such as `Panel`, `Field`, `Pill`, and `JsonBlock` are kept in the same file as the dashboard page.
- `web/src/main.tsx` performs a defensive root-element check before calling `createRoot()`.

---

## Convention analysis

2026-04-12
