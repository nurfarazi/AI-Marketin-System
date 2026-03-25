# AI Marketing System Detailed Documentation

## Purpose and Audience
This document describes the AI Marketing System at a high level, focusing on architecture, workflow, data model, the Ollama-only AI stack, and the 10‑sprint delivery roadmap. It is written for product, engineering, and technical stakeholders who need to understand how the system fits together without code-level detail.

## Architecture Overview
The system is a staged pipeline that turns client inputs into structured insights, creative ideas, and a final report.

Core layers:
- Input ingestion: collect website URLs, reviews/forums text, Meta ad screenshots, and Meta CSV exports.
- Normalization: unify raw inputs into consistent, comparable structures.
- Unified data store (MongoDB): track projects, ingestions, normalized sources, analyses, creatives, reports, and jobs.
- AI pipeline: run separate stages for insight extraction, performance analysis, and creative analysis.
- Output generation: produce creative concepts and a report narrative.
- Orchestration: track job states, retries, and completion, enabling asynchronous workflows.

All AI-driven logic uses Ollama as the only model provider.

## Workflow Narrative
1. A project is created to scope a client engagement.
2. Inputs are ingested in raw form (URLs, text, screenshots, CSVs).
3. Ingested sources are normalized into a consistent shape to reduce noise and variability.
4. Analysis jobs are created:
   - Insight extraction (pain points, angles, objections)
   - Performance analysis (metrics and observations)
   - Creative analysis (hooks, critique, suggestions)
5. Creative generation uses analysis outputs to propose ad concepts and messaging.
6. Report generation composes the final narrative and structured outputs for delivery.
7. Jobs and artifacts remain queryable so clients can poll status and retrieve results.

## Data Model Summary
The system models each pipeline step explicitly.

Entities:
- Project: client scope and objectives.
- Ingestion: raw input submitted by users. Status: `received` or `failed`.
- NormalizedSource: cleaned, unified representation of ingested data. Status: `queued`, `completed`, `failed`.
- Analysis: structured AI outputs, with stage-by-stage status for insight, performance, and creative analysis.
- Creative: generated ad concepts and creative ideas.
- Report: final output with narrative summary and optional PDF link.
- Job: orchestration unit for background processing. Status: `queued`, `running`, `completed`, `failed`.

The job entity is the source of truth for pipeline execution and supports retries and progress tracking.

## Ollama-Only AI Stack
All AI calls use Ollama’s local REST API. This keeps model inference on the local machine or server, enabling privacy and predictable costs.

Key characteristics:
- Base URL: `http://127.0.0.1:11434` (configurable via environment).
- Default model: `llama3.1` (configurable).
- Non-streaming responses for simplicity and stable parsing.

AI usage by stage:
- Insight extraction: structured JSON output for angles, pain points, and objections.
- Performance analysis: structured JSON summary with metrics and observations.
- Creative analysis: structured JSON for hooks, critique, and suggestions.
- Report generation: narrative executive summary.
- Creative generation: structured ad concept ideas and messaging.

## API Contract Summary
All routes are versioned under `/api/v1`. Responses follow a consistent `{ data: ... }` format for success and `{ error: ... }` for errors.

Projects:
- `GET /api/v1/projects`
- `POST /api/v1/projects`
- `GET /api/v1/projects/:projectId`

Ingestion:
- `POST /api/v1/projects/:projectId/ingestions`
  - Body: `{ type: "url" | "text" | "image" | "csv", payload: { ... } }`
- `GET /api/v1/projects/:projectId/ingestions`

Normalization:
- `POST /api/v1/projects/:projectId/normalizations`
  - Optional body: `{ ingestionIds: [ ... ] }`
- `GET /api/v1/projects/:projectId/normalizations`

Analysis:
- `POST /api/v1/projects/:projectId/analyses`
  - Optional body: `{ normalizedIds: [ ... ] }`
- `GET /api/v1/projects/:projectId/analyses`
- `GET /api/v1/analyses/:analysisId`

Creative generation:
- `POST /api/v1/projects/:projectId/creatives`
  - Optional body: `{ analysisId: "..." }`
- `GET /api/v1/projects/:projectId/creatives`
- `GET /api/v1/creatives/:creativeId`

Reports:
- `POST /api/v1/projects/:projectId/reports`
  - Optional body: `{ analysisId: "...", creativeId: "...", summary: "..." }`
- `GET /api/v1/projects/:projectId/reports`
- `GET /api/v1/reports/:reportId`
- `GET /api/v1/reports/:reportId/download`

Jobs:
- `GET /api/v1/projects/:projectId/jobs`
- `GET /api/v1/jobs/:jobId`

## Job States and Orchestration
Jobs enable asynchronous processing without blocking API responses.

Job lifecycle:
- `queued`: accepted and waiting to run
- `running`: in progress
- `completed`: finished successfully
- `failed`: finished with errors

Each job stores inputs, outputs, and timestamps for traceability. Retry counts and maximum retries are tracked for future queue integrations.

## 10‑Sprint Delivery Roadmap
1. Foundation + Architecture + Data Model
2. Input Ingestion (scraping + uploads + parsing)
3. Data Normalization + Cleaning Layer
4. Insight Extraction (LLM pipeline v1)
5. Meta Performance Analysis (metrics + rules)
6. Creative Analysis (OCR + heuristics)
7. Report Generator
8. Creative Generation
9. Workflow Orchestration (queues, retries, job states)
10. Refinement + Quality + UI / Dashboard (optional)

Each sprint should result in a demoable increment and maintain the Ollama-only AI constraint.

## Assumptions and Current Limitations
- MongoDB is the system of record; connection and authentication are expected to be managed by the deployment environment.
- No authentication or multi-tenant security is enforced yet.
- PDF generation is represented as a placeholder download path.
- Ollama model responses are assumed to be well-formed JSON where required; parsing includes safe fallback behavior.
- The UI/dashboard is optional and not implemented in the current backend scope.

## Notes on Future Extensions
Future iterations can plug in real scrapers, file uploads, persistent storage, queue backends, and PDF rendering without altering the high-level pipeline contract.
