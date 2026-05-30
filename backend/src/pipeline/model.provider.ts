import { MODEL_CONFIG, COST_TABLE } from '../config/models.config';
import OpenAI from 'openai';
import axios from 'axios';

type ModelResult = {
  model: string;
  text: string;
  tokens_in: number;
  tokens_out: number;
  cost?: number;
  latencyMs?: number;
};

// Instantiate OpenAI client lazily inside callOpenAI to avoid throwing at import when no key provided

async function exponentialBackoff(attempt: number) {
  const ms = Math.min(1000 * Math.pow(2, attempt), 16000);
  return new Promise((r) => setTimeout(r, ms));
}

async function callOpenAI(model: string, prompt: string): Promise<ModelResult> {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const start = Date.now();
  const resp = (await openai.responses.create({ model, input: prompt })) as unknown;
  const latencyMs = Date.now() - start;
  // try to extract text safely
  let text = '';
  try {
    const r = resp as Record<string, unknown>;
    if (Array.isArray(r.output)) {
      text = r.output.map((o) => ((o as Record<string, unknown>).content as unknown) as string).join('');
    } else if (r.output && Array.isArray((r.output as unknown) as unknown[])) {
      text = String(r.output);
    } else {
      text = String(r.output ?? '');
    }
  } catch (e) { text = String(resp); }
  const usage = (resp as Record<string, unknown>)['usage'] as Record<string, unknown> | undefined;
  const tokens_in = usage && typeof usage['input_tokens'] === 'number' ? (usage['input_tokens'] as number) : Math.max(1, Math.floor(prompt.length / 4));
  const tokens_out = usage && typeof usage['output_tokens'] === 'number' ? (usage['output_tokens'] as number) : Math.max(1, Math.floor(text.length / 4));
  return { model, text, tokens_in, tokens_out, latencyMs };
}

async function callClaude(model: string, prompt: string): Promise<ModelResult> {
  const start = Date.now();
  const url = 'https://api.anthropic.com/v1/complete';
  const body = { model, prompt, max_tokens: 1000 };
  const resp = await axios.post(url, body, { headers: { 'x-api-key': process.env.CLAUDE_API_KEY } });
  const latencyMs = Date.now() - start;
  const text = resp.data && typeof resp.data === 'object' && 'completion' in resp.data ? String((resp.data as Record<string, unknown>)['completion']) : JSON.stringify(resp.data);
  const tokens_in = Math.max(1, Math.floor(prompt.length / 4));
  const tokens_out = Math.max(1, Math.floor(text.length / 4));
  return { model, text, tokens_in, tokens_out, latencyMs };
}

async function callGroq(model: string, prompt: string): Promise<ModelResult> {
  const start = Date.now();
  const url = process.env.GROQ_API_URL || 'https://api.groq.ai/llm/v1';
  const resp = await axios.post(url, { model, prompt }, { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` } });
  const latencyMs = Date.now() - start;
  const text = resp.data && typeof resp.data === 'object' && 'text' in resp.data ? String((resp.data as Record<string, unknown>)['text']) : JSON.stringify(resp.data);
  const tokens_in = Math.max(1, Math.floor(prompt.length / 4));
  const tokens_out = Math.max(1, Math.floor(text.length / 4));
  return { model, text, tokens_in, tokens_out, latencyMs };
}

async function callDeepSeek(model: string, prompt: string): Promise<ModelResult> {
  const start = Date.now();
  const url = process.env.DEEPSEEK_URL || 'https://api.deepseek.ai/generate';
  const resp = await axios.post(url, { model, prompt }, { headers: { Authorization: `Bearer ${process.env.DEEPSEEK_KEY}` } });
  const latencyMs = Date.now() - start;
  const text = resp.data && typeof resp.data === 'object' && 'text' in resp.data ? String((resp.data as Record<string, unknown>)['text']) : JSON.stringify(resp.data);
  const tokens_in = Math.max(1, Math.floor(prompt.length / 4));
  const tokens_out = Math.max(1, Math.floor(text.length / 4));
  return { model, text, tokens_in, tokens_out, latencyMs };
}

async function callGemini(model: string, prompt: string): Promise<ModelResult> {
  const start = Date.now();
  const url = process.env.GEMINI_URL || 'https://gemini.googleapis.com/v1/models/' + model + ':generateText';
  const resp = await axios.post(url, { prompt }, { headers: { Authorization: `Bearer ${process.env.GEMINI_KEY}` } });
  const latencyMs = Date.now() - start;
  const text = (resp.data && typeof resp.data === 'object' && Array.isArray((resp.data as Record<string, unknown>)['candidates'])) ? ((resp.data as Record<string, unknown>)['candidates'] as unknown[]).map((c) => String((c as Record<string, unknown>)['content'])).join('\n') : JSON.stringify(resp.data);
  const tokens_in = Math.max(1, Math.floor(prompt.length / 4));
  const tokens_out = Math.max(1, Math.floor(text.length / 4));
  return { model, text, tokens_in, tokens_out, latencyMs };
}

async function callOpenRouter(model: string, prompt: string): Promise<ModelResult> {
  const start = Date.now();
  const url = 'https://api.openrouter.ai/v1/chat/completions';
  const resp = await axios.post(url, { model, messages: [{ role: 'user', content: prompt }] }, { headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` } });
  const latencyMs = Date.now() - start;
  const text = (resp.data && typeof resp.data === 'object' && Array.isArray((resp.data as Record<string, unknown>)['choices'])) ? ((resp.data as Record<string, unknown>)['choices'] as unknown[]).map((c) => String(((c as Record<string, unknown>)['message'] as Record<string, unknown>)['content'])).join('') : JSON.stringify(resp.data);
  const tokens_in = Math.max(1, Math.floor(prompt.length / 4));
  const tokens_out = Math.max(1, Math.floor(text.length / 4));
  return { model, text, tokens_in, tokens_out, latencyMs };
}

async function callProvider(model: string, prompt: string): Promise<ModelResult> {
  // dispatch by substring
  if (model.startsWith('gpt') || model.startsWith('gpt-4o')) return callOpenAI(model, prompt);
  if (model.startsWith('claude')) return callClaude(model, prompt);
  if (model.startsWith('groq') || model.includes('mixtral')) return callGroq(model, prompt);
  if (model.startsWith('deepseek')) return callDeepSeek(model, prompt);
  if (model.startsWith('gemini')) return callGemini(model, prompt);
  // fallback
  return callOpenRouter(model, prompt);
}

export async function callModel(stage: string, prompt: string) {
  const candidates = MODEL_CONFIG[stage] || ['openrouter-fallback'];
  let lastErr: unknown = null;
  for (const model of candidates) {
    // try up to 3 retries with backoff
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const start = Date.now();
        const res = await callProvider(model, prompt);
        const latencyMs = res.latencyMs || (Date.now() - start);
        const costInfo = COST_TABLE[res.model] || COST_TABLE['openrouter-fallback'];
        const cost = ((res.tokens_in / 1000) * costInfo.costPer1kIn) + ((res.tokens_out / 1000) * costInfo.costPer1kOut);
        return { ...res, cost, latencyMs };
      } catch (err: unknown) {
        lastErr = err;
        let code: number | string | undefined;
        if (typeof err === 'object' && err !== null) {
          const e = err as Record<string, unknown>;
          const resp = e['response'] as Record<string, unknown> | undefined;
          if (resp && typeof resp['status'] === 'number') code = resp['status'] as number;
          else if (typeof e['code'] === 'string' || typeof e['code'] === 'number') code = e['code'] as string | number;
          else if (typeof e['status'] === 'number') code = e['status'] as number;
        }
        if (code === 429 || (typeof code === 'number' && code >= 500 && code < 600)) {
          await exponentialBackoff(attempt);
          continue; // retry same model
        } else {
          break; // move to next model
        }
      }
    }
  }

  // final fallback to openrouter
  try {
    const res = await callOpenRouter('openrouter-fallback', prompt);
    const costInfo = COST_TABLE['openrouter-fallback'];
    const cost = ((res.tokens_in / 1000) * costInfo.costPer1kIn) + ((res.tokens_out / 1000) * costInfo.costPer1kOut);
    return { ...res, cost };
  } catch (err) {
    throw lastErr || err;
  }
}
