import { z } from 'zod';

const EntityField = z.object({ name: z.string(), type: z.string() });

export const EntitySchema = z.object({
  name: z.string(),
  tableName: z.string(),
  tenantId: z.literal(true),
  fields: z.array(EntityField).min(1),
  relations: z.array(z.string()).optional(),
});

export const DataSchema = z.object({ entities: z.array(EntitySchema).min(1) });

export type DataSchemaType = z.infer<typeof DataSchema>;
