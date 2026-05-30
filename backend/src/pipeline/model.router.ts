/*
  Model router configuration (mock).
  Maps pipeline stages to model names and provides mocked generators.
*/

export const modelMap = {
  intent: ['gpt-4o-mini', 'mistral'],
  schema: ['gpt-4o', 'deepseek'],
  appspec: ['claude', 'gpt-4o'],
};

// Mock generation functions produce structured JSON objects based on prompt.
import { Intent, DataSchema, AppSpec } from '../types';

export function generateIntent(prompt: string): Intent {
  // naive extraction: first line as appName, check for entities
  const lines = prompt.split('\n').map((l) => l.trim()).filter(Boolean);
  const appName = lines[0] ? lines[0].split(' ').slice(0,3).join(' ') : 'MyApp';
  const features = ['auth', 'crud', 'list'];
  const entities = (prompt.match(/\bUser\b|\bProduct\b|\bOrder\b/g) || []);
  const integrations_requested = (prompt.match(/Stripe|Firebase|Auth0|Slack|SendGrid/gi) || []) as string[];
  const assumptions = ['single-tenant', 'standard auth'];
  return {
    appName,
    appType: 'web',
    features,
    entities: entities.length ? entities : ['User','Product'],
    integrations_requested,
    assumptions,
  } as Intent;
}

export function generateSchema(intent: Intent): DataSchema {
  const entities = (intent.entities || []).map((e) => {
    const name = typeof e === 'string' ? e : String(e);
    const tableName = `${name.toLowerCase()}s`;
    return {
      name,
      tableName,
      tenantId: true as true,
      fields: [
        { name: 'id', type: 'string' },
        { name: 'tenantId', type: 'string' },
      ],
      relations: [],
    };
  });
  return { entities } as DataSchema;
}

export function generateAppSpec(intent: Intent, schema: DataSchema): AppSpec {
  const pages = [
    { path: '/', name: 'Home' },
    { path: '/dashboard', name: 'Dashboard' },
  ];
  const apiEndpoints = (schema.entities || []).map((e) => ({ method: 'GET', path: `/api/${e.tableName}`, entity: e.name }));
  const authRules = [{ role: 'admin', allow: ['read','write','delete'] }];
  const integrationHooks = (intent.integrations_requested || []).map((i) => ({ name: i, hook: `/hooks/${i.toLowerCase()}` }));
  const workflowStubs = [{ name: 'createItem', steps: [] }];
  return { pages, apiEndpoints, authRules, integrationHooks, workflowStubs } as AppSpec;
}
