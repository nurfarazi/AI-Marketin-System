# AI Marketing System REST API

Requires Node.js 24 or newer.

Minimal Express scaffold for the staged AI marketing pipeline. All AI/LLM features are designed to use the Ollama API only.

The app defaults to port `5011` unless `PORT` is set in the environment.

## Prerequisites

- Node.js 24+
- Ollama running locally (default: `http://localhost:11434`)
- MongoDB running locally (default: `mongodb://127.0.0.1:27017`)
- A local `.env` file for environment variables

Environment variables:

- `MONGO_URI` (defaults to `mongodb://127.0.0.1:27017`)
- `MONGO_DB_NAME` (defaults to `ai_marketing_system`)
- `OLLAMA_BASE_URL` (defaults to `http://127.0.0.1:11434`)
- `OLLAMA_MODEL` (defaults to `llama3.1`)

Copy [`.env.example`](/mnt/d/git/Hobby/AI-Marketin-System/.env.example) to `.env` to get the local defaults in one place.

## Run

```bash
npm install
npm start
```

For local development:

```bash
npm run dev
```

For Docker:

```bash
docker compose up --build
```

This starts MongoDB and the API together. The app container uses `mongodb://mongo:27017` internally and reaches Ollama through `host.docker.internal`.

## Endpoints

- `GET /health`
- `GET /api/v1/projects`
- `POST /api/v1/projects`
- `POST /api/v1/projects/:projectId/ingestions`
- `POST /api/v1/projects/:projectId/normalizations`
- `POST /api/v1/projects/:projectId/analyses`
- `POST /api/v1/projects/:projectId/creatives`
- `POST /api/v1/projects/:projectId/reports`
- `GET /api/v1/reports/:reportId/download`
- `GET /api/v1/projects/:projectId/jobs`

## Request examples

See [docs/http/ai-marketing-system.http](/mnt/d/git/Hobby/AI-Marketin-System/docs/http/ai-marketing-system.http) for copy-paste request examples.
