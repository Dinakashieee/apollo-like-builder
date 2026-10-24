import { z } from 'npm:zod@3.25.76';

export const companySignalSchema = z.object({
  fit_grade: z.enum(['A', 'B', 'C']).nullable(),
  intent_level: z.enum(['high', 'medium', 'low']).nullable(),
  signal_strength: z.enum(['high', 'medium', 'low']).nullable(),
  buying_stage: z.number().int().min(0).max(4).nullable(),
  reasoning: z.string().min(1).max(4000),
  sources: z.array(z.object({ title: z.string(), url: z.string().url(), evidence: z.string() })).max(10),
});