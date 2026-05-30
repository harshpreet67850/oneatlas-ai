import { ServerResponse } from 'http';

type JobRecord = {
  jobId: string;
  prompt: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: string;
};

class JobStore {
  private store = new Map<string, JobRecord>();
  private subscribers = new Map<string, Set<ServerResponse>>();

  create(job: JobRecord) {
    this.store.set(job.jobId, job);
  }

  update(jobId: string, patch: Partial<JobRecord>) {
    const existing = this.store.get(jobId);
    if (!existing) return;
    const updated = { ...existing, ...patch };
    this.store.set(jobId, updated);
    this.publish(jobId, { type: 'job_update', payload: updated });
  }

  get(jobId: string) {
    return this.store.get(jobId);
  }

  subscribeSSE(jobId: string, res: ServerResponse) {
    res.writeHead(200, {
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
      'Content-Type': 'text/event-stream',
    });
    res.write('\n');
    const set = this.subscribers.get(jobId) || new Set();
    set.add(res);
    this.subscribers.set(jobId, set);
    res.on('close', () => {
      set.delete(res);
    });
  }

  publish(jobId: string, event: any) {
    const set = this.subscribers.get(jobId);
    if (!set) return;
    const payload = JSON.stringify(event);
    for (const res of set) {
      try {
        res.write(`event: message\ndata: ${payload}\n\n`);
      } catch (err) {
        // noop
      }
    }
  }
}

export default new JobStore();
