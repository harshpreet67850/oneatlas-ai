import { useState, useEffect } from 'react';

export default function Home() {
  const [prompt, setPrompt] = useState('My Inventory App with Users and Products');
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<any | null>(null);
  const [events, setEvents] = useState<any[]>([]);

  async function createJob() {
    const res = await fetch('http://localhost:4000/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const json = await res.json();
    setJobId(json.jobId);
    setJob(null);
    setEvents([]);
  }

  useEffect(() => {
    if (!jobId) return;
    // connect SSE
    const es = new EventSource(`http://localhost:4000/api/generate/${jobId}/stream`);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        setEvents((s) => [...s, data]);
      } catch (e) {
        // ignore
      }
    };
    es.onerror = () => {
      es.close();
    };

    const poll = setInterval(async () => {
      const r = await fetch(`http://localhost:4000/api/generate/${jobId}`);
      const j = await r.json();
      setJob(j);
    }, 1500);

    return () => {
      es.close();
      clearInterval(poll);
    };
  }, [jobId]);

  return (
    <div style={{ padding: 20, fontFamily: 'Arial' }}>
      <h1>OneAtlas AI — App Generator</h1>
      <textarea rows={6} value={prompt} onChange={(e) => setPrompt(e.target.value)} style={{ width: '100%' }} />
      <div style={{ marginTop: 8 }}>
        <button onClick={createJob}>Generate</button>
      </div>

      {jobId && (
        <div style={{ marginTop: 16 }}>
          <div><strong>Job ID:</strong> {jobId}</div>
          <div style={{ marginTop: 8 }}><strong>Status:</strong> {job?.status}</div>
          <div style={{ marginTop: 8 }}>
            <strong>Events:</strong>
            <pre style={{ background: '#f6f8fa', padding: 8 }}>{JSON.stringify(events, null, 2)}</pre>
          </div>
          <div style={{ marginTop: 8 }}>
            <strong>Result:</strong>
            <pre style={{ background: '#f6f8fa', padding: 8 }}>{JSON.stringify(job?.result, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
