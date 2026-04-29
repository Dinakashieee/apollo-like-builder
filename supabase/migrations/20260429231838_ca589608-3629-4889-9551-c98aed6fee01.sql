ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS country text;
CREATE INDEX IF NOT EXISTS idx_leads_workspace_country ON public.leads (workspace_id, country);