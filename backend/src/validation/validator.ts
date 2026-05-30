export function validateIntent(obj: any) {
  if (!obj) return { ok: false, error: 'Intent is null' };
  if (!obj.appName) return { ok: false, error: 'appName missing' };
  if (!Array.isArray(obj.features)) return { ok: false, error: 'features must be array' };
  if (!Array.isArray(obj.entities)) return { ok: false, error: 'entities must be array' };
  return { ok: true };
}

export function validateSchema(obj: any) {
  if (!obj) return { ok: false, error: 'Schema is null' };
  if (!Array.isArray(obj.entities)) return { ok: false, error: 'entities must be array' };
  for (const e of obj.entities) {
    if (!e.name) return { ok: false, error: 'entity missing name' };
    if (!Array.isArray(e.fields)) return { ok: false, error: 'entity.fields must be array' };
  }
  return { ok: true };
}

export function validateAppSpec(obj: any) {
  if (!obj) return { ok: false, error: 'AppSpec is null' };
  if (!Array.isArray(obj.pages)) return { ok: false, error: 'pages must be array' };
  if (!Array.isArray(obj.apiEndpoints)) return { ok: false, error: 'apiEndpoints must be array' };
  return { ok: true };
}
