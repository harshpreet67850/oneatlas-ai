// Three repair strategies: jsonRepair, missingFieldRepair, schemaConsistencyRepair

export function jsonRepair(raw: string) {
  try {
    return { ok: true, data: JSON.parse(raw) };
  } catch (err) {
    // attempt to safe-fix common trailing commas
    try {
      const cleaned = raw.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      return { ok: true, data: JSON.parse(cleaned) };
    } catch (e) {
      return { ok: false, error: 'JSON repair failed' };
    }
  }
}

export function missingFieldRepair(obj: any, stage: 'intent' | 'schema' | 'appspec') {
  if (!obj) obj = {};
  if (stage === 'intent') {
    obj.appName = obj.appName || 'Untitled App';
    obj.appType = obj.appType || 'web';
    obj.features = Array.isArray(obj.features) ? obj.features : [];
    obj.entities = Array.isArray(obj.entities) ? obj.entities : [];
    obj.integrations_requested = Array.isArray(obj.integrations_requested) ? obj.integrations_requested : [];
  }
  if (stage === 'schema') {
    obj.entities = Array.isArray(obj.entities) ? obj.entities : [];
    obj.entities = obj.entities.map((e: any) => ({
      name: e.name || 'Entity',
      tableName: e.tableName || `${(e.name||'entity').toLowerCase()}s`,
      tenantId: true,
      fields: Array.isArray(e.fields) ? e.fields : [{ name: 'id', type: 'string' }, { name: 'tenantId', type: 'string' }],
      relations: Array.isArray(e.relations) ? e.relations : [],
    }));
  }
  if (stage === 'appspec') {
    obj.pages = Array.isArray(obj.pages) ? obj.pages : [];
    obj.apiEndpoints = Array.isArray(obj.apiEndpoints) ? obj.apiEndpoints : [];
    obj.authRules = Array.isArray(obj.authRules) ? obj.authRules : [];
    obj.integrationHooks = Array.isArray(obj.integrationHooks) ? obj.integrationHooks : [];
    obj.workflowStubs = Array.isArray(obj.workflowStubs) ? obj.workflowStubs : [];
  }
  return obj;
}

export function schemaConsistencyRepair(schema: any) {
  if (!schema) return { ok: false, error: 'schema null' };
  schema.entities = (schema.entities || []).map((e: any) => {
    e.fields = e.fields || [{ name: 'id', type: 'string' }];
    e.relations = e.relations || [];
    if (!e.tableName) e.tableName = `${(e.name||'entity').toLowerCase()}s`;
    e.tenantId = true;
    return e;
  });
  return { ok: true, data: schema };
}
