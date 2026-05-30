import { Intent, DataSchema, RepairLog } from '../types';
import { getIntegration } from '../integrations/registry';

export function generateWorkflowStubs(intent: Intent, schema: DataSchema) {
  const stubs: Array<Record<string, unknown>> = [];
  const logs: RepairLog[] = [];
  for (const name of intent.integrations_requested || []) {
    const reg = getIntegration(name.toLowerCase());
    if (!reg) {
      logs.push({ strategy: 'workflow_generate', input_error: `integration ${name} not found`, success: false, timestamp: new Date().toISOString() });
      continue;
    }
    const action = reg.actions[0];
    const entity = schema.entities[0];
    if (!entity) {
      logs.push({ strategy: 'workflow_generate', input_error: 'no entities in schema', success: false, timestamp: new Date().toISOString() });
      continue;
    }
    const payload: Record<string, string> = {};
    for (const f of entity.fields) payload[f.name] = `{${entity.name}.${f.name}}`;
    const stub: Record<string, unknown> = {
      name: `${reg.id}_${action}_on_${entity.name}`,
      trigger: { entity: entity.name, event: 'onCreate', condition: '' },
      integration: reg.id,
      action,
      payloadMapping: payload,
    };
    stubs.push(stub);
    logs.push({ strategy: 'workflow_generate', output: stub, success: true, timestamp: new Date().toISOString() });
  }
  return { stubs, logs };
}
