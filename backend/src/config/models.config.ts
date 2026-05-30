export const MODEL_CONFIG: Record<string, string[]> = {
  intent: ['gpt-4o-mini', 'gpt-4o', 'claude-sonnet'],
  schema: ['gpt-4o', 'deepseek', 'groq-mixtral'],
  appspec: ['claude-haiku', 'gpt-4o', 'gemini'],
};

export const COST_TABLE: Record<string, { costPer1kOut: number; costPer1kIn: number }> = {
  'gpt-4o-mini': { costPer1kIn: 0.0005, costPer1kOut: 0.001 },
  'gpt-4o': { costPer1kIn: 0.002, costPer1kOut: 0.004 },
  'claude-sonnet': { costPer1kIn: 0.0015, costPer1kOut: 0.003 },
  'claude-haiku': { costPer1kIn: 0.0008, costPer1kOut: 0.0016 },
  'deepseek': { costPer1kIn: 0.001, costPer1kOut: 0.002 },
  'groq-mixtral': { costPer1kIn: 0.0009, costPer1kOut: 0.0018 },
  'gemini': { costPer1kIn: 0.0012, costPer1kOut: 0.0024 },
  'openrouter-fallback': { costPer1kIn: 0.003, costPer1kOut: 0.006 },
};
