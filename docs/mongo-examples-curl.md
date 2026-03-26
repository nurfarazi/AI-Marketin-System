# MongoDB + Ollama API Examples (curl)

These examples assume:
- MongoDB is reachable at the `MONGO_URI` value in your `.env`
- Ollama is reachable at the `OLLAMA_BASE_URL` value in your `.env`
- The API server is running at the `PORT` value in your `.env`

If you are using a `.env` file, typical entries are:
```
PORT=5011
LOG_LEVEL=info
CORS_ORIGIN=*
MONGO_URI=mongodb://127.0.0.1:27017
MONGO_DB_NAME=ai_marketing_system
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1
OLLAMA_TEMPERATURE=0.2
```

## Scenario 1: Create a project

```bash
curl -X POST http://localhost:5011/api/v1/projects \
  -H "content-type: application/json" \
  -d '{
    "name": "Demo Project",
    "clientName": "Acme Co",
    "objective": "Increase CTR on Meta ads"
  }'
```

Expected: `201` with a `data.id` field you will use in later steps.

## Scenario 2: Ingest a text source

```bash
curl -X POST http://localhost:5011/api/v1/projects/<PROJECT_ID>/ingestions \
  -H "content-type: application/json" \
  -d '{
    "type": "text",
    "payload": {
      "sourceName": "G2 reviews",
      "text": "Customers want faster setup and lower costs."
    }
  }'
```

Expected: `201` with `data.id` (ingestion id) and status `received`.

## Scenario 3: Normalize ingestions

```bash
curl -X POST http://localhost:5011/api/v1/projects/<PROJECT_ID>/normalizations \
  -H "content-type: application/json" \
  -d '{
    "ingestionIds": ["<INGESTION_ID>"]
  }'
```

Expected: `202` with a job object and a `normalizedSources` array. Capture the first `normalizedSources[].id`.

## Scenario 4: Run analysis, creative generation, and report

### 4A. Start analysis
```bash
curl -X POST http://localhost:5011/api/v1/projects/<PROJECT_ID>/analyses \
  -H "content-type: application/json" \
  -d '{
    "normalizedIds": ["<NORMALIZED_ID>"]
  }'
```
Expected: `202` with `data.analysis.id` and `data.job.id`.

### 4B. Wait for analysis to complete
```bash
curl http://localhost:5011/api/v1/analyses/<ANALYSIS_ID>
```
Expected: `200` with `data.status` = `completed`.

### 4C. Start creative generation
```bash
curl -X POST http://localhost:5011/api/v1/projects/<PROJECT_ID>/creatives \
  -H "content-type: application/json" \
  -d '{
    "analysisId": "<ANALYSIS_ID>"
  }'
```
Expected: `202` with `data.creative.id`. Poll `GET /api/v1/creatives/<CREATIVE_ID>` until status is `completed`.

### 4D. Generate report
```bash
curl -X POST http://localhost:5011/api/v1/projects/<PROJECT_ID>/reports \
  -H "content-type: application/json" \
  -d '{
    "analysisId": "<ANALYSIS_ID>",
    "creativeId": "<CREATIVE_ID>"
  }'
```
Expected: `202` with `data.report.id`. Poll `GET /api/v1/reports/<REPORT_ID>` until status is `completed`.

## Scenario 5: Inspect jobs and download report

### 5A. List all jobs for a project
```bash
curl http://localhost:5011/api/v1/projects/<PROJECT_ID>/jobs
```
Expected: `200` with `data` array showing job status for normalization, analysis, creative, and report.

### 5B. Download report placeholder
```bash
curl -O http://localhost:5011/api/v1/reports/<REPORT_ID>/download
```
Expected: `200` with a text placeholder (PDF generation is not yet implemented).
