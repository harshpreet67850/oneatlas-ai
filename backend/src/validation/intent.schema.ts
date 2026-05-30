import { z } from 'zod';

export const IntentSchema = z.object({
  appName: z.string().min(1),
  appType: z.enum(['web', 'mobile', 'api']),
  features: z.array(z.string()),
  entities: z.array(z.string()).optional(),
  integrations_requested: z.array(z.string()).optional(),
  assumptions: z.array(z.string()).optional(),
});

export type IntentType = z.infer<typeof IntentSchema>;
