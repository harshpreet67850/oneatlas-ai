// Three repair strategies: jsonRepair, missingFieldRepair, schemaConsistencyRepair

import { RepairLog, StageId, DataSchema, AppSpec } from '../types';

type RepairResult<T> = { success: boolean; output?: T; log: RepairLog };

export function structural_repair(raw: string): RepairResult<unknown> {
  try {
    const parsed = JSON.parse(raw);
    return { success: true, output: parsed, log: { strategy: 'structural_repair', output: parsed, success: true, timestamp: new Date().toISOString() } };
  } catch (err) {
    try {
      const cleaned = raw.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      const parsed = JSON.parse(cleaned);
      return { success: true, output: parsed, log: { strategy: 'structural_repair', input_error: String(err), output: parsed, success: true, timestamp: new Date().toISOString() } };
    } catch (e) {
      return { success: false, log: { strategy: 'structural_repair', input_error: String(err), output: undefined, success: false, timestamp: new Date().toISOString() } };
    }
  }
}

export function field_repair<T extends object>(obj: T | undefined, stage: StageId): RepairResult<T> {
  const log: RepairLog = { strategy: 'field_repair', output: undefined, success: false, timestamp: new Date().toISOString() };
  const out = (obj || {}) as Record<string, unknown>;
  if (stage === 'intent') {
    out.appName = out.appName || 'Untitled App';
    out.appType = out.appType || 'web';
    out.features = Array.isArray(out.features) ? out.features : [];
    out.entities = Array.isArray(out.entities) ? out.entities : [];
    out.integrations_requested = Array.isArray(out.integrations_requested) ? out.integrations_requested : [];
  }
  if (stage === 'schema') {
    const entitiesArr = Array.isArray(out.entities) ? out.entities as unknown[] : [];
    out.entities = entitiesArr.map((e) => {
      const rec = e as Record<string, unknown>;
      const name = typeof rec.name === 'string' ? rec.name : 'Entity';
      return {
        name,
        tableName: typeof rec.tableName === 'string' ? rec.tableName : `${name.toLowerCase()}s`,
        tenantId: true as true,
        fields: Array.isArray(rec.fields) ? rec.fields as unknown[] : [{ name: 'id', type: 'string' }, { name: 'tenantId', type: 'string' }],
        relations: Array.isArray(rec.relations) ? rec.relations as string[] : [],
      };
    });
  }
  if (stage === 'appspec') {
    out.pages = Array.isArray(out.pages) ? out.pages as unknown[] : [];
    out.apiEndpoints = Array.isArray(out.apiEndpoints) ? out.apiEndpoints as unknown[] : [];
    out.authRules = Array.isArray(out.authRules) ? out.authRules as unknown[] : [];
    out.integrationHooks = Array.isArray(out.integrationHooks) ? out.integrationHooks as unknown[] : [];
    out.workflowStubs = Array.isArray(out.workflowStubs) ? out.workflowStubs as unknown[] : [];
  }
  log.output = out;
  log.success = true;
  return { output: out as unknown as T, log, success: true };
}

export function consistency_repair(schema: DataSchema): { ok: boolean; data?: DataSchema; log: RepairLog } {
  const log: RepairLog = { strategy: 'consistency_repair', output: undefined, success: false, timestamp: new Date().toISOString() };
  if (!schema) {
    log.success = false;
    return { ok: false, log };
  }
  const out = { ...schema };
  out.entities = (out.entities || []).map((e) => {
    const copy = { ...e };
    copy.fields = copy.fields || [{ name: 'id', type: 'string' }];
    copy.relations = copy.relations || [];
    if (!copy.tableName) copy.tableName = `${(copy.name || 'entity').toLowerCase()}s`;
    copy.tenantId = true as true;
    return copy;
  });
  log.output = out;
  log.success = true;
  return { ok: true, data: out, log };
}

export { RepairLog };
