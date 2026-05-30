import { ServerResponse } from 'http';
import { JobState, PipelineEvent } from '../types';

class JobStore {
  private store = new Map<string, JobState>();
  private subscribers = new Map<string, Set<ServerResponse>>();
  private events = new Map<string, PipelineEvent[]>();

  create(job: JobState) {
    this.store.set(job.jobId, job);
    this.events.set(job.jobId, []);
  }

  update(jobId: string, patch: Partial<JobState>) {
    const existing = this.store.get(jobId);
    if (!existing) return;
    const updated = { ...existing, ...patch } as JobState;
    this.store.set(jobId, updated);
    this.publish(jobId, { jobId, stage: 'system', timestamp: Date.now(), data: { type: 'job_update', payload: updated }, type: 'job_update' });
  }

  appendEvent(jobId: string, event: PipelineEvent) {
    const list = this.events.get(jobId) || [];
    const enriched: PipelineEvent = { ...event, timestamp: event.timestamp || Date.now() };
    list.push(enriched);
    this.events.set(jobId, list);
    this.publish(jobId, enriched);
  }

  get(jobId: string): JobState | undefined {
    return this.store.get(jobId);
  }

  getEvents(jobId: string): PipelineEvent[] {
    return this.events.get(jobId) || [];
  }

  subscribeSSE(jobId: string, res: ServerResponse) {
    res.writeHead(200, {
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
      'Content-Type': 'text/event-stream; charset=utf-8',
    });
    // replay history
    const history = this.getEvents(jobId);
    for (const ev of history) {
      try {
        res.write(`event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`);
      } catch (err) {
        // noop
      }
    }
    const set = this.subscribers.get(jobId) || new Set();
    set.add(res);
    this.subscribers.set(jobId, set);
    res.on('close', () => set.delete(res));
  }

  publish(jobId: string, event: PipelineEvent) {
    const set = this.subscribers.get(jobId);
    if (!set) return;
    const payload = JSON.stringify(event);
    for (const res of set) {
      try { res.write(`event: ${event.type}\ndata: ${payload}\n\n`); } catch (err) { }
    }
  }
}

export default new JobStore();
