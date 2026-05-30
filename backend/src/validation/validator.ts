import { IntentSchema } from './intent.schema';
import { DataSchema } from './schema.schema';
import { AppSpecSchema } from './appspec.schema';

type ValidateResult = { stage: string; errors: string[]; recoverable: boolean };

function zodErrors(e: unknown): string[] {
  if (typeof e === 'object' && e !== null) {
    const ev = e as Record<string, unknown>;
    if (Array.isArray(ev.errors)) {
      return (ev.errors as unknown[]).map((it) => {
        if (typeof it === 'object' && it !== null) {
          const rec = it as Record<string, unknown>;
          const path = Array.isArray(rec.path) ? (rec.path as unknown[]).map((p) => String(p)).join('.') : '';
          const message = typeof rec.message === 'string' ? rec.message : String(it);
          return `${path} ${message}`.trim();
        }
        return String(it);
      });
    }
  }
  return [String(e)];
}

export function validateIntent(obj: unknown): ValidateResult {
  try {
    IntentSchema.parse(obj);
    return { stage: 'intent', errors: [], recoverable: false };
  } catch (e) {
    return { stage: 'intent', errors: zodErrors(e), recoverable: true };
  }
}

export function validateSchema(obj: unknown): ValidateResult {
  try {
    const parsed = DataSchema.parse(obj);
    // ensure tenantId true on all entities and relations valid structure
    const names = parsed.entities.map((x) => x.name);
    for (const e of parsed.entities) {
      if (e.tenantId !== true) return { stage: 'schema', errors: ['tenantId required on all entities'], recoverable: true };
      if (e.relations) {
        for (const r of e.relations) {
          if (!names.includes(r)) return { stage: 'schema', errors: [`relation ${r} references unknown entity`], recoverable: false };
        }
      }
    }
    return { stage: 'schema', errors: [], recoverable: false };
  } catch (e) {
    return { stage: 'schema', errors: zodErrors(e), recoverable: true };
  }
}

export function validateAppSpec(obj: unknown): ValidateResult {
  try {
    const parsed = AppSpecSchema.parse(obj);
    const apis = (parsed.apiEndpoints || []).map((a) => a.path);
    for (const p of parsed.pages) {
      if (p.api && !apis.includes(p.api)) return { stage: 'appspec', errors: [`page ${p.path} references missing api ${p.api}`], recoverable: true };
    }
    return { stage: 'appspec', errors: [], recoverable: false };
  } catch (e) {
    return { stage: 'appspec', errors: zodErrors(e), recoverable: true };
  }
}
