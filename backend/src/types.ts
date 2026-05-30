export type StageId = 'intent' | 'schema' | 'appspec';

export interface Intent {
  appName: string;
  appType: 'web' | 'mobile' | 'api';
  features: string[];
  entities?: string[];
  integrations_requested?: string[];
  assumptions?: string[];
}

export interface EntityField { name: string; type: string }

export interface Entity {
  name: string;
  tableName: string;
  tenantId: true;
  fields: EntityField[];
  relations?: string[];
}

export interface DataSchema { entities: Entity[] }

export interface ApiEndpoint { method: string; path: string; entity?: string }

export interface AppSpec {
  pages: { path: string; name: string; api?: string }[];
  apiEndpoints: ApiEndpoint[];
  authRules?: { role: string; allow: string[] }[];
  integrationHooks?: { name: string; hook?: string; action?: string }[];
  workflowStubs?: Array<Record<string, unknown>>;
}

export interface ModelUsage { model: string; tokensIn: number; tokensOut: number; cost: number; latencyMs: number }

export interface CostEntry { stage: StageId; model: string; tokensIn: number; tokensOut: number; cost: number }

export interface RepairLog { strategy: string; input_error?: string; output?: unknown; success: boolean; timestamp: string }

export interface PipelineEvent { jobId: string; stage: StageId | 'system'; timestamp: number; data?: unknown; latency?: number; type: string }

export interface JobState {
  jobId: string;
  prompt: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  intent?: Intent;
  schema?: DataSchema;
  appspec?: AppSpec;
  errors?: string[];
  repair_logs?: RepairLog[];
  cost_per_stage?: Record<string, number>;
  latency_per_stage?: Record<string, number>;
  model_used_per_stage?: Record<string, string>;
  result?: { intent?: Intent; schema?: DataSchema; appspec?: AppSpec };
  createdAt: string;
}
