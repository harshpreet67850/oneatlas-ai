import { Intent, DataSchema, AppSpec } from '../types';
import { getIntegration } from '../integrations/registry';

type Issue = { type: 'missing_entity' | 'invalid_relation' | 'invalid_integration'; message: string; stage: string };

export function crossValidate(intent: Intent | undefined, schema: DataSchema | undefined, appspec: AppSpec | undefined) {
  const issues: Issue[] = [];
  if (!intent || !schema) return { ok: true, issues };
  const schemaEntities = new Set(schema.entities.map((e) => e.name));
  // Intent -> Schema
  for (const e of intent.entities || []) {
    if (!schemaEntities.has(e)) issues.push({ type: 'missing_entity', message: `entity ${e} declared in intent missing from schema`, stage: 'intent' });
  }

  if (schema && appspec) {
    // Schema -> AppSpec checks
    const pages = appspec.pages || [];
    for (const p of pages) {
      if (p.api) {
        const api = (appspec.apiEndpoints || []).find((a) => a.path === p.api);
        if (api && api.entity && !schemaEntities.has(api.entity)) issues.push({ type: 'missing_entity', message: `page ${p.path} references entity ${api.entity} not in schema`, stage: 'appspec' });
      }
    }
    // relations
    for (const e of schema.entities) {
      for (const r of e.relations || []) {
        if (!schemaEntities.has(r)) issues.push({ type: 'invalid_relation', message: `entity ${e.name} relation to ${r} invalid`, stage: 'schema' });
      }
    }
  }

  // integration validation
  for (const hook of appspec?.integrationHooks || []) {
    const reg = getIntegration(hook.name.toLowerCase());
    if (!reg) issues.push({ type: 'invalid_integration', message: `integration ${hook.name} not registered`, stage: 'appspec' });
    else if (hook.action && !reg.actions.includes(hook.action)) issues.push({ type: 'invalid_integration', message: `integration ${hook.name} invalid action ${hook.action}`, stage: 'appspec' });
  }

  return { ok: issues.length === 0, issues };
}
