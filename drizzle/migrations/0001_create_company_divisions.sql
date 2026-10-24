CREATE TABLE public.company_divisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.account_intelligence(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'division',
  description text,
  fit_grade text NOT NULL DEFAULT 'B',
  intent_level text NOT NULL DEFAULT 'medium',
  signal_strength text NOT NULL DEFAULT 'medium',
  buying_stage integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX company_divisions_company_id_idx ON public.company_divisions (company_id);
CREATE INDEX company_divisions_workspace_id_idx ON public.company_divisions (workspace_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_divisions TO authenticated;
GRANT ALL ON public.company_divisions TO service_role;

ALTER TABLE public.company_divisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read company divisions"
  ON public.company_divisions FOR SELECT
  TO authenticated
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members create company divisions"
  ON public.company_divisions FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members update company divisions"
  ON public.company_divisions FOR UPDATE
  TO authenticated
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members delete company divisions"
  ON public.company_divisions FOR DELETE
  TO authenticated
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER set_company_divisions_updated_at
  BEFORE UPDATE ON public.company_divisions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();