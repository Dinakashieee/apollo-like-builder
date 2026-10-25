import { z } from 'npm:zod@3.25.76';

export const companySignalSchema = z.object({
  fit_grade: z.enum(['A', 'B', 'C']).nullable(),
  intent_level: z.enum(['high', 'medium', 'low']).nullable(),
  signal_strength: z.enum(['high', 'medium', 'low']).nullable(),
  buying_stage: z.number().int().min(0).max(4).nullable(),
  reasoning: z.string().min(1).max(4000),
  decision_makers: z.array(z.object({ full_name: z.string(), role: z.string(), linkedin_url: z.string().url(), why_selected: z.string(), source_url: z.string().url(), quote: z.string(), publication_year: z.number().nullable().optional() })).max(6).default([]),
  sources: z.array(z.object({ title: z.string(), url: z.string().url(), evidence: z.string(), publication_year: z.number().nullable().optional(), checked_at: z.string().optional(), verification: z.enum(["page_checked", "search_only"]).optional() })).max(10),
});