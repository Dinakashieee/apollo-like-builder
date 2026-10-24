ALTER TABLE public.account_intelligence ADD COLUMN signals_status text NOT NULL DEFAULT 'pending', ADD COLUMN signals_generated_at timestamptz, ADD COLUMN signals_evidence jsonb NOT NULL DEFAULT '{}'::jsonb, ADD COLUMN signals_error text;
ALTER TABLE public.company_divisions ADD COLUMN signals_status text NOT NULL DEFAULT 'pending', ADD COLUMN signals_generated_at timestamptz, ADD COLUMN signals_evidence jsonb NOT NULL DEFAULT '{}'::jsonb, ADD COLUMN signals_error text;
CREATE UNIQUE INDEX account_intelligence_workspace_name_unique ON public.account_intelligence(workspace_id, lower(trim(company_name)));
CREATE OR REPLACE FUNCTION public.sync_lead_company_account() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
IF NEW.is_demo = false AND trim(NEW.company_name) <> '' THEN
INSERT INTO public.account_intelligence(workspace_id, company_name, fit_grade, intent_level, signal_strength, buying_stage) VALUES (NEW.workspace_id, trim(NEW.company_name), 'C', 'low', 'low', 0) ON CONFLICT (workspace_id, (lower(trim(company_name)))) DO NOTHING;
END IF; RETURN NEW; END; $$;
CREATE TRIGGER sync_lead_company_account AFTER INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.sync_lead_company_account();