
CREATE TABLE public.signalhire_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  request_id text UNIQUE,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  profiles_count int NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX signalhire_searches_workspace_idx ON public.signalhire_searches(workspace_id, created_at DESC);
CREATE INDEX signalhire_searches_request_idx ON public.signalhire_searches(request_id);

GRANT SELECT, INSERT, UPDATE ON public.signalhire_searches TO authenticated;
GRANT ALL ON public.signalhire_searches TO service_role;

ALTER TABLE public.signalhire_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view workspace searches"
  ON public.signalhire_searches FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "members create workspace searches"
  ON public.signalhire_searches FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND user_id = auth.uid());

CREATE TRIGGER set_updated_at_signalhire_searches
  BEFORE UPDATE ON public.signalhire_searches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.signalhire_searches;
