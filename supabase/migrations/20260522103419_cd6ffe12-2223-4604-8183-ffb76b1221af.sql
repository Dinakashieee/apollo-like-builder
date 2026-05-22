
CREATE TABLE public.market_intelligence (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  market_pain_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  focus_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  market_trends jsonb NOT NULL DEFAULT '[]'::jsonb,
  trends_refreshed_at timestamptz,
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.market_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read market intel"
ON public.market_intelligence FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members upsert market intel"
ON public.market_intelligence FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members update market intel"
ON public.market_intelligence FOR UPDATE TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members delete market intel"
ON public.market_intelligence FOR DELETE TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));
