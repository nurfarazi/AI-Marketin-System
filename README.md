# AI Marketing System REST API

Requires Node.js 24 or newer.

Minimal Express scaffold for the staged AI marketing pipeline. All AI/LLM features are designed to use the Ollama API only.

The app defaults to port `5011` unless `PORT` is set in the environment.

There is also a React dashboard in [`web/`](/mnt/d/git/Hobby/AI-Marketin-System/web) for creating projects, capturing inputs, running the workflow, and downloading reports.

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
- `PORT` (defaults to `5011`)

Copy [`.env.example`](/mnt/d/git/Hobby/AI-Marketin-System/.env.example) to `.env` to get the local defaults in one place.

## How To Run

### 1. Prepare environment variables

```bash
cp .env.example .env
```

The example file is ready for local development. If you want the API to run on a different port, change `PORT` in `.env` and point the frontend to the same URL.

### 2. Start MongoDB and Ollama

Run both locally before starting the API, or use Docker Compose to bring MongoDB up for you.

- MongoDB: `mongodb://127.0.0.1:27017`
- Ollama: `http://127.0.0.1:11434`

### 3. Install dependencies

```bash
npm install
cd web
npm install
cd ..
```

### 4. Run the backend

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm run build
npm start
```

The API runs on `http://localhost:5011` by default.

### 5. Run the frontend

```bash
npm run web:dev
```

Or run it directly from the frontend folder:

```bash
cd web
npm run dev
```

Set `VITE_API_BASE_URL` in [`web/.env`](/mnt/d/git/Hobby/AI-Marketin-System/web/.env) to point the web app at your API before starting it.

### 6. Run everything with Docker

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
