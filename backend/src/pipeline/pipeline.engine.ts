import jobStore from '../store/job.store';
import { callModel } from './model.provider';
import { validateIntent, validateSchema, validateAppSpec } from '../validation/validator';
import { structural_repair, field_repair, consistency_repair, RepairLog } from '../repair/repair.engine';
import { generateIntent, generateSchema, generateAppSpec } from './model.router';
import { validateIntegrationHook, getIntegration } from '../integrations/registry';
import { crossValidate } from '../validation/consistency';
import { generateWorkflowStubs } from './workflow.generator';
import { JobState, StageId, PipelineEvent, CostEntry, ModelUsage, Intent, DataSchema, AppSpec } from '../types';

export async function runPipeline(prompt: string, jobId: string) {
  jobStore.update(jobId, { status: 'running' } as Partial<JobState>);

  const costEntries: CostEntry[] = [];
  const repairLogs: RepairLog[] = [];

  async function stageRun<T>(stage: StageId, promptPayload: string, parseFallback: () => T): Promise<T | undefined> {
    const start = Date.now();
    jobStore.appendEvent(jobId, { jobId, stage, timestamp: Date.now(), data: { event: 'stage_start' }, type: 'stage_start' });
    try {
      const modelRes = await callModel(stage, promptPayload);
      // record cost entry
      costEntries.push({ stage, model: modelRes.model, tokensIn: modelRes.tokens_in, tokensOut: modelRes.tokens_out, cost: modelRes.cost || 0 });
      jobStore.appendEvent(jobId, { jobId, stage, timestamp: Date.now(), data: { event: 'model_used', model: modelRes.model }, type: 'model_used' });

      // attempt structural repair
      let attempts = 0;
      let lastOutput: unknown = undefined;
      while (attempts < 2) {
        attempts += 1;
        const s = structural_repair(modelRes.text);
        jobStore.appendEvent(jobId, { jobId, stage, timestamp: Date.now(), data: { event: 'repair_attempt', strategy: 'structural_repair', attempt: attempts }, type: 'repair_attempt' });
        repairLogs.push(s.log);
        if (s.success) {
          lastOutput = s.output;
          jobStore.appendEvent(jobId, { jobId, stage, timestamp: Date.now(), data: { event: 'repair_success', strategy: 'structural_repair' }, type: 'repair_success' });
          break;
        } else {
          jobStore.appendEvent(jobId, { jobId, stage, timestamp: Date.now(), data: { event: 'repair_failed', strategy: 'structural_repair' }, type: 'repair_failed' });
        }
      }

      if (lastOutput === undefined) {
        // fallback to internal generator
        const fallback = parseFallback();
        jobStore.appendEvent(jobId, { jobId, stage, timestamp: Date.now(), data: { event: 'stage_complete', output: fallback }, type: 'stage_complete', latency: Date.now() - start });
        return fallback;
      }

      // further field repair if needed
      const fr = field_repair(lastOutput as object, stage);
      repairLogs.push(fr.log);
      if (fr.success) {
        jobStore.appendEvent(jobId, { jobId, stage, timestamp: Date.now(), data: { event: 'repair_success', strategy: 'field_repair' }, type: 'repair_success' });
      }

      jobStore.appendEvent(jobId, { jobId, stage, timestamp: Date.now(), data: { event: 'stage_complete', output: fr.output }, type: 'stage_complete', latency: Date.now() - start });
      return fr.output as T;
    } catch (err) {
      jobStore.appendEvent(jobId, { jobId, stage, timestamp: Date.now(), data: { event: 'stage_failed', error: String(err) }, type: 'stage_failed' });
      jobStore.update(jobId, { status: 'failed', errors: [String(err)] } as Partial<JobState>);
      return undefined;
    }
  }

  // Intent
  const intent = await stageRun('intent', prompt, () => generateIntent(prompt));
  if (!intent) return;
  jobStore.update(jobId, { intent } as Partial<JobState>);

  // validate intent
  try {
    const vi = validateIntent(intent as unknown);
    if (vi.errors.length) {
      jobStore.appendEvent(jobId, { jobId, stage: 'intent', timestamp: Date.now(), data: { type: 'validation_failed', errors: vi.errors }, type: 'validation_failed' });
      if (vi.recoverable) {
        const fr = field_repair(intent as object, 'intent');
        repairLogs.push(fr.log);
        if (fr.success) jobStore.appendEvent(jobId, { jobId, stage: 'intent', timestamp: Date.now(), data: { type: 'repair_success', strategy: 'field_repair' }, type: 'repair_success' });
        jobStore.update(jobId, { intent: fr.output } as Partial<JobState>);
      } else {
        jobStore.update(jobId, { status: 'failed', errors: vi.errors } as Partial<JobState>);
        return;
      }
    }
  } catch (e) {
    // noop
  }

  // Schema
  const schemaPayload = JSON.stringify(intent);
  const schema = await stageRun<DataSchema>('schema', schemaPayload, () => generateSchema(intent as Intent));
  if (!schema) return;
  // validate schema
  try {
    const vs = validateSchema(schema as unknown);
    if (vs.errors.length) {
      jobStore.appendEvent(jobId, { jobId, stage: 'schema', timestamp: Date.now(), data: { type: 'validation_failed', errors: vs.errors }, type: 'validation_failed' });
      if (vs.recoverable) {
        const fr = field_repair(schema as object, 'schema');
        repairLogs.push(fr.log);
        jobStore.appendEvent(jobId, { jobId, stage: 'schema', timestamp: Date.now(), data: { type: 'repair_attempt', strategy: 'field_repair' }, type: 'repair_attempt' });
      } else {
        jobStore.update(jobId, { status: 'failed', errors: vs.errors } as Partial<JobState>);
        return;
      }
    }
  } catch (e) {}
  // ensure consistency repair
  const cr = consistency_repair(schema as DataSchema);
  if (!cr.ok) { jobStore.appendEvent(jobId, { jobId, stage: 'schema', timestamp: Date.now(), data: { event: 'stage_failed', error: 'consistency_repair_failed' }, type: 'stage_failed' }); jobStore.update(jobId, { status: 'failed', errors: ['consistency_repair_failed'] } as Partial<JobState>); return; }
  jobStore.update(jobId, { schema: cr.data } as Partial<JobState>);

  // generate workflow stubs for requested integrations
  const intentObj = intent as unknown as Intent;
  const schemaObj = cr.data as DataSchema;
  const wf = generateWorkflowStubs(intentObj, schemaObj);

  // AppSpec
  const appspecPayload = JSON.stringify({ intent: intentObj, schema: schemaObj });
  const appspec = await stageRun<AppSpec>('appspec', appspecPayload, () => generateAppSpec(intentObj, schemaObj));
  if (!appspec) return;
  // attach workflow stubs
  const appspecObj = appspec as AppSpec;
  appspecObj.workflowStubs = ((appspecObj.workflowStubs || []) as Array<Record<string, unknown>>).concat(wf.stubs);
  repairLogs.push(...wf.logs as RepairLog[]);

  // validate appspec
  try {
    const va = validateAppSpec(appspecObj as unknown);
    if (va.errors.length) {
      jobStore.appendEvent(jobId, { jobId, stage: 'appspec', timestamp: Date.now(), data: { type: 'validation_failed', errors: va.errors }, type: 'validation_failed' });
      if (va.recoverable) {
        const fr = field_repair(appspecObj as object, 'appspec');
        repairLogs.push(fr.log);
        if (fr.success) jobStore.appendEvent(jobId, { jobId, stage: 'appspec', timestamp: Date.now(), data: { type: 'repair_success', strategy: 'field_repair' }, type: 'repair_success' });
      } else {
        jobStore.update(jobId, { status: 'failed', errors: va.errors } as Partial<JobState>);
        return;
      }
    }
  } catch (e) {}

  // cross-stage consistency validation
  const consistency = crossValidate(intentObj, schemaObj, appspecObj);
  if (!consistency.ok) {
    jobStore.appendEvent(jobId, { jobId, stage: 'appspec', timestamp: Date.now(), data: { event: 'stage_failed', issues: consistency.issues }, type: 'stage_failed' });
    jobStore.update(jobId, { status: 'failed', errors: consistency.issues.map((i) => i.message) } as Partial<JobState>);
    return;
  }

  // Ensure integration hooks and workflow stubs reference valid registry items
  try {
    const { listIntegrations, getIntegration } = require('../integrations/registry');
    const valid = new Set(listIntegrations().map((i: any) => i.id.toLowerCase()));
    appspecObj.integrationHooks = (appspecObj.integrationHooks || []).filter((h) => typeof h.name === 'string' && valid.has(h.name.toLowerCase()));
    appspecObj.workflowStubs = (appspecObj.workflowStubs || []).filter((s: any) => {
      const integ = typeof s.integration === 'string' ? s.integration.toLowerCase() : '';
      const entity = s.trigger && s.trigger.entity ? String(s.trigger.entity) : '';
      if (!valid.has(integ)) return false;
      if (!schemaObj.entities.find((e) => e.name === entity)) return false;
      const reg = getIntegration(integ);
      if (!reg) return false;
      return Array.isArray(reg.actions) && reg.actions.includes(String(s.action));
    });
  } catch (e) {}

  jobStore.update(jobId, { appspec, repair_logs: repairLogs, cost_per_stage: Object.fromEntries(costEntries.map((c) => [c.stage, c.cost])), model_used_per_stage: Object.fromEntries(costEntries.map((c) => [c.stage, c.model])), latency_per_stage: {} } as Partial<JobState>);

  const full = { intent: jobStore.get(jobId)?.intent, schema: jobStore.get(jobId)?.schema, appspec: jobStore.get(jobId)?.appspec };
  jobStore.appendEvent(jobId, { jobId, stage: 'system', timestamp: Date.now(), data: { event: 'generation_complete', output: full }, type: 'generation_complete' });
  jobStore.update(jobId, { status: 'completed', result: full } as Partial<JobState>);
  return full;
}
