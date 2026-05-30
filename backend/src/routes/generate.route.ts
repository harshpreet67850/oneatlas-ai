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
    } catch (err: any) {
      jobStore.update(jobId, { status: 'failed', error: String(err) });
      jobStore.publish(jobId, { event: 'pipeline_error', error: String(err) });
    }
  });

  res.json({ jobId });
});

router.get('/generate/:jobId', (req, res) => {
  const job = jobStore.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'job not found' });
  res.json(job);
});

// SSE stream for job events
router.get('/generate/:jobId/stream', (req, res) => {
  const jobId = req.params.jobId;
  const job = jobStore.get(jobId);
  if (!job) return res.status(404).json({ error: 'job not found' });
  jobStore.subscribeSSE(jobId, res as any);
});

export default router;
