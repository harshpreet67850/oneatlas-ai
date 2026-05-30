import jobStore from '../store/job.store';
import { generateIntent, generateSchema, generateAppSpec } from './model.router';
import { validateIntent, validateSchema, validateAppSpec } from '../validation/validator';
import { missingFieldRepair, schemaConsistencyRepair } from '../repair/repair.engine';

export async function runPipeline(prompt: string, jobId: string) {
  jobStore.update(jobId, { status: 'running' });

  // Intent stage
  jobStore.publish(jobId, { event: 'stage_start', stage: 'intent' });
  const intent = generateIntent(prompt);
  const vIntent = validateIntent(intent);
  if (!vIntent.ok) {
    const repaired = missingFieldRepair(intent, 'intent');
    if (repaired) {
      jobStore.publish(jobId, { event: 'stage_repair', stage: 'intent' });
    }
  }
  jobStore.publish(jobId, { event: 'stage_complete', stage: 'intent', output: intent });

  // Schema stage
  jobStore.publish(jobId, { event: 'stage_start', stage: 'schema' });
  let schema = generateSchema(intent);
  const vSchema = validateSchema(schema);
  if (!vSchema.ok) {
    schema = missingFieldRepair(schema, 'schema');
    const consistency = schemaConsistencyRepair(schema);
    if (!consistency.ok) {
      jobStore.update(jobId, { status: 'failed', error: 'Schema repair failed' });
      jobStore.publish(jobId, { event: 'stage_failed', stage: 'schema' });
      return;
    }
    schema = consistency.data;
  }
  jobStore.publish(jobId, { event: 'stage_complete', stage: 'schema', output: schema });

  // AppSpec stage
  jobStore.publish(jobId, { event: 'stage_start', stage: 'appspec' });
  let appspec = generateAppSpec(intent, schema);
  const vApp = validateAppSpec(appspec);
  if (!vApp.ok) {
    appspec = missingFieldRepair(appspec, 'appspec');
  }
  jobStore.publish(jobId, { event: 'stage_complete', stage: 'appspec', output: appspec });

  const full = { intent, schema, appspec };
  jobStore.update(jobId, { status: 'completed', result: full });
  return full;
}
