export type Integration = {
  id: string;
  displayName: string;
  authType: 'none' | 'apiKey' | 'oauth';
  triggers: string[];
  actions: string[];
  inputSchema?: Record<string, string>;
  outputSchema?: Record<string, string>;
};

const REGISTRY: Record<string, Integration> = {
  slack: { id: 'slack', displayName: 'Slack', authType: 'oauth', triggers: ['onCreate'], actions: ['sendMessage'], inputSchema: { channel: 'string', text: 'string' }, outputSchema: { ts: 'string' } },
  whatsapp: { id: 'whatsapp', displayName: 'WhatsApp', authType: 'apiKey', triggers: ['onCreate'], actions: ['sendMessage'], inputSchema: { to: 'string', body: 'string' }, outputSchema: { messageId: 'string' } },
  stripe: { id: 'stripe', displayName: 'Stripe', authType: 'apiKey', triggers: ['onCreate','onUpdate'], actions: ['charge','refund'], inputSchema: { amount: 'number', currency: 'string' }, outputSchema: { id: 'string', status: 'string' } },
  gmail: { id: 'gmail', displayName: 'Gmail', authType: 'oauth', triggers: ['onCreate'], actions: ['sendEmail'], inputSchema: { to: 'string', subject: 'string', body: 'string' }, outputSchema: { messageId: 'string' } },
  webhook: { id: 'webhook', displayName: 'Webhook', authType: 'none', triggers: ['onCreate'], actions: ['post'], inputSchema: { url: 'string', payload: 'object' }, outputSchema: { status: 'string' } },
  github: { id: 'github', displayName: 'GitHub', authType: 'oauth', triggers: ['onCreate'], actions: ['createIssue','createPR'], inputSchema: { repo: 'string', title: 'string', body: 'string' }, outputSchema: { id: 'number' } },
};

export function getIntegration(id: string): Integration | undefined {
  return REGISTRY[id];
}

export function validateIntegrationHook(hook: { name?: string; action?: string }) {
  if (!hook || !hook.name) return { ok: false, error: 'invalid hook' };
  const reg = getIntegration(hook.name.toLowerCase());
  if (!reg) return { ok: false, error: `integration ${hook.name} not found` };
  if (hook.action && !reg.actions.includes(hook.action)) return { ok: false, error: `action ${hook.action} invalid for ${hook.name}` };
  return { ok: true };
}

export function listIntegrations(): Integration[] {
  return Object.values(REGISTRY);
}
