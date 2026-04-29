
CREATE TABLE public.user_dashboard_prefs (
  user_id UUID NOT NULL PRIMARY KEY,
  visible_tiles TEXT[] NOT NULL DEFAULT ARRAY['kpis','velocity','funnel','live_activity','top_opportunities','ai_insight'],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_dashboard_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own dashboard prefs"
  ON public.user_dashboard_prefs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own dashboard prefs"
  ON public.user_dashboard_prefs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own dashboard prefs"
  ON public.user_dashboard_prefs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
