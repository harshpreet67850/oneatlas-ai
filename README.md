# OneAtlas AI — AI Native App Generator Pipeline

This repo contains a simple production-like prototype of the OneAtlas AI pipeline.

Folders:
- backend: Node + TypeScript Express API that runs the pipeline
- frontend: Next.js UI to submit prompts and view results

Run backend:

```bash
cd backend
npm install
npm run dev
```

Run frontend:

```bash
cd frontend
npm install
npm run dev
```

The backend listens on port 4000 and exposes:
- POST /api/generate { prompt }
- GET /api/generate/:jobId
- GET /api/generate/:jobId/stream  (SSE)
