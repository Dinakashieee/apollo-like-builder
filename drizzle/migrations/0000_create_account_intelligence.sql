CREATE TABLE public.account_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  domain TEXT,
  fit_grade TEXT NOT NULL DEFAULT 'B' CHECK (fit_grade IN ('A','B','C')),
  intent_level TEXT NOT NULL DEFAULT 'medium' CHECK (intent_level IN ('high','medium','low')),
  signal_strength TEXT NOT NULL DEFAULT 'medium' CHECK (signal_strength IN ('high','medium','low')),
  buying_stage INTEGER NOT NULL DEFAULT 0 CHECK (buying_stage BETWEEN 0 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_intelligence TO authenticated;
GRANT ALL ON public.account_intelligence TO service_role;

ALTER TABLE public.account_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read account intelligence" ON public.account_intelligence
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members create account intelligence" ON public.account_intelligence
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members update account intelligence" ON public.account_intelligence
  FOR UPDATE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members delete account intelligence" ON public.account_intelligence
  FOR DELETE TO authenticated USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER trg_account_intelligence_updated
  BEFORE UPDATE ON public.account_intelligence
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();