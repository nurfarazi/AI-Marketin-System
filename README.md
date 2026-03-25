# AI Marketing System REST API

Requires Node.js 24 or newer.

Minimal Express scaffold for the staged AI marketing pipeline. All AI/LLM features are designed to use the Ollama API only.

## Prerequisites

- Node.js 24+
- Ollama running locally (default: `http://localhost:11434`)

## Run

```bash
npm install
npm start
```

For local development:

```bash
npm run dev
```

## Endpoints

- `GET /health`
- `GET /api/v1/projects`
- `POST /api/v1/projects`
- `POST /api/v1/projects/:projectId/ingestions`
- `POST /api/v1/projects/:projectId/analyses`
- `POST /api/v1/projects/:projectId/reports`
- `GET /api/v1/reports/:reportId/download`
