import { z } from 'zod';

const ApiEndpoint = z.object({ method: z.string(), path: z.string(), entity: z.string().optional() });

export const AppSpecSchema = z.object({
  pages: z.array(z.object({ path: z.string(), name: z.string(), api: z.string().optional() })).min(1),
  apiEndpoints: z.array(ApiEndpoint).min(0),
  authRules: z.array(z.object({ role: z.string(), allow: z.array(z.string()) })).optional(),
  integrationHooks: z.array(z.object({ name: z.string(), hook: z.string().optional(), action: z.string().optional() })).optional(),
  workflowStubs: z.array(z.record(z.unknown())).optional(),
});

export type AppSpecType = z.infer<typeof AppSpecSchema>;
