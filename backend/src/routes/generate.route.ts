import express from 'express';
import { makeId } from '../utils/id';
import jobStore from '../store/job.store';
import { runPipeline } from '../pipeline/pipeline.engine';

const router = express.Router();

router.post('/generate', (req, res) => {
  const prompt = req.body.prompt;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt required' });
  }
  const jobId = makeId('job');
  const now = new Date().toISOString();
  jobStore.create({ jobId, prompt, status: 'pending', createdAt: now });

  // Run pipeline async
  setImmediate(async () => {
    try {
      await runPipeline(prompt, jobId);
    } catch (err: unknown) {
      const msg = typeof err === 'string' ? err : (err instanceof Error ? err.message : String(err));
      jobStore.update(jobId, { status: 'failed', errors: [msg] });
      jobStore.appendEvent(jobId, { jobId, stage: 'system', timestamp: Date.now(), data: { type: 'pipeline_error', error: msg }, type: 'pipeline_error' });
    }
  });

  res.json({ jobId });
});

router.get('/generate/:jobId', (req, res) => {
  const job = jobStore.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'job not found' });
  res.json(job);
});

router.get('/integrations', (req, res) => {
  // lightweight listing from registry
  const { listIntegrations } = require('../integrations/registry');
  res.json(listIntegrations());
});

// SSE stream for job events
router.get('/generate/:jobId/stream', (req, res) => {
  const jobId = req.params.jobId;
  const job = jobStore.get(jobId);
  if (!job) return res.status(404).json({ error: 'job not found' });
  jobStore.subscribeSSE(jobId, res as unknown as import('http').ServerResponse);
  // heartbeat every 12s
  const iv = setInterval(() => {
    try { res.write(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`); } catch (e) { }
  }, 12000);

  // close connection when job completes or fails
  const watcher = setInterval(() => {
    const j = jobStore.get(jobId);
    if (!j) return;
    if (j.status === 'completed' || j.status === 'failed') {
      try {
        res.write(`event: generation_complete\ndata: ${JSON.stringify({ status: j.status, ts: Date.now() })}\n\n`);
      } catch (e) {}
      clearInterval(iv);
      clearInterval(watcher);
      // do not forcibly end; let client close
    }
  }, 1500);
  req.on('close', () => {
    clearInterval(iv);
    clearInterval(watcher);
  });
});

export default router;
