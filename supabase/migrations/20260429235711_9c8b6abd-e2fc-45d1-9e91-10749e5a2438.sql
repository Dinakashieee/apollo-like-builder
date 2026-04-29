-- Per-workspace BYO OAuth credentials (Google + Microsoft)
CREATE TABLE public.user_oauth_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  label TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider)
);

ALTER TABLE public.user_oauth_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read oauth apps"
  ON public.user_oauth_apps FOR SELECT TO authenticated
  USING (is_workspace_owner(workspace_id, auth.uid()));

CREATE POLICY "Owners insert oauth apps"
  ON public.user_oauth_apps FOR INSERT TO authenticated
  WITH CHECK (is_workspace_owner(workspace_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Owners update oauth apps"
  ON public.user_oauth_apps FOR UPDATE TO authenticated
  USING (is_workspace_owner(workspace_id, auth.uid()));

CREATE POLICY "Owners delete oauth apps"
  ON public.user_oauth_apps FOR DELETE TO authenticated
  USING (is_workspace_owner(workspace_id, auth.uid()));

CREATE POLICY "Service role manages oauth apps"
  ON public.user_oauth_apps FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_user_oauth_apps_updated_at
  BEFORE UPDATE ON public.user_oauth_apps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Short-lived OAuth state for CSRF protection
CREATE TABLE public.oauth_state (
  state TEXT PRIMARY KEY,
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  redirect_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes')
);

ALTER TABLE public.oauth_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages oauth state"
  ON public.oauth_state FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Onboarding dismissal flag
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS inbox_prompt_dismissed_at TIMESTAMPTZ;