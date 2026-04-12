# Technology Stack

**Analysis Date:** 2026-04-12

## Languages

**Primary:**

- TypeScript (`src/**/*.ts`, `web/src/**/*.ts`, `web/src/**/*.tsx`)

**Secondary:**

- Markdown (`README.md`, `docs/**`)
- JSON (`package.json`, `web/package.json`, `tsconfig.json`)

## Runtime

**Environment:**

- Node.js 24+ (`package.json`, `Dockerfile`, `README.md`)

**Package Manager:**

- npm
- Lockfiles present: `package-lock.json`, `web/package-lock.json`

## Frameworks

**Core:**

- Express `^5.2.1` for the REST API (`src/app.ts`, `src/routes/index.ts`)
- MongoDB Node.js driver `^7.1.1` for persistence (`src/db/mongo.ts`)
- React `^19.1.0` + Vite `^7.1.0` for the dashboard (`web/package.json`, `web/vite.config.ts`)

**Testing:**

- Node built-in test runner via `node --import tsx --test` (`package.json`)
- Playwright `^1.58.2` for browser smoke coverage (`package.json`, `tmp_playwright_smoke.cjs`)

**Build/Dev:**

- TypeScript compiler (`tsconfig.json`, `package.json`)
- `tsx` watch mode for backend development (`package.json`)
- Vite dev/preview/build scripts for the web app (`web/package.json`)

## Key Dependencies

**Critical:**

- `dotenv` for environment loading (`src/server.ts`)
- `express` for HTTP routing (`src/app.ts`, `src/routes/index.ts`)
- `mongodb` for the document store (`src/db/mongo.ts`)
- `node-fetch` is declared in `package.json`; runtime HTTP calls use global `fetch` in `src/services/ollama.ts` and `web/src/api.ts`

**Infrastructure:**

- `@types/express`, `@types/node` for TypeScript support
- `tsx` for test execution and watch-mode development
- `@vitejs/plugin-react` for the web build pipeline

## Configuration

**Environment:**

- Root `.env.example` documents `PORT`, `LOG_LEVEL`, `CORS_ORIGIN`, `MONGO_URI`, `MONGO_DB_NAME`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, and `OLLAMA_TEMPERATURE`
- `web/.env.example` documents `VITE_API_BASE_URL`
- `src/config/env.ts` enforces required values and parses numeric env vars

**Build:**

- `tsconfig.json` compiles `src/**/*.ts` into `dist`
- `web/vite.config.ts` emits the frontend build to `web/dist`
- `Dockerfile` builds the backend from `node:24`

## Platform Requirements

**Development:**

- Node.js 24+
- Local MongoDB instance
- Local Ollama instance
- npm

**Production:**

- Containerized API (`Dockerfile`)
- MongoDB 7.0 service in `docker-compose.yml`
- API port `5011`; MongoDB port `27017`

Stack analysis: 2026-04-12
