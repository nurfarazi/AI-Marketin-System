# AI Marketing System REST API

Requires Node.js 24 or newer.

Minimal Express scaffold for the staged AI marketing pipeline. All AI/LLM features are designed to use the Ollama API only.

Set `PORT` in your environment before starting the app.

There is also a React dashboard in [`web/`](/mnt/d/git/Hobby/AI-Marketin-System/web) for creating projects, capturing inputs, running the workflow, and downloading reports.

## Prerequisites

- Node.js 24+
- Ollama running locally
- MongoDB running locally
- A local `.env` file for environment variables

- `PORT`
- `LOG_LEVEL`
- `CORS_ORIGIN`
- `MONGO_URI`
- `MONGO_DB_NAME`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `OLLAMA_TEMPERATURE`

Copy [`.env.example`](/mnt/d/git/Hobby/AI-Marketin-System/.env.example) to `.env` and fill in the required values before starting the app.

## How To Run

### 1. Prepare environment variables

```bash
cp .env.example .env
```

The example file is ready for local development. Set the values to match your machine, especially `PORT`, `MONGO_URI`, `MONGO_DB_NAME`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, and `OLLAMA_TEMPERATURE`.

### 2. Start MongoDB and Ollama

Run both locally before starting the API, or use Docker Compose to bring MongoDB up for you.

- MongoDB: whatever `MONGO_URI` points to in your `.env`
- Ollama: whatever `OLLAMA_BASE_URL` points to in your `.env`

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

The API runs on the `PORT` value from your `.env`.

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
