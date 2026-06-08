
-- 1. landing_page_views: replace permissive UPDATE policy with a SECURITY DEFINER RPC
DROP POLICY IF EXISTS "Anyone can update own view by id" ON public.landing_page_views;

CREATE OR REPLACE FUNCTION public.track_landing_view(
  _view_id uuid,
  _visitor_id text,
  _duration_ms integer DEFAULT NULL,
  _cta_clicked boolean DEFAULT NULL,
  _cta_index integer DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.landing_page_views
  SET
    duration_ms = COALESCE(_duration_ms, duration_ms),
    cta_clicked = COALESCE(_cta_clicked, cta_clicked),
    cta_index   = COALESCE(_cta_index, cta_index)
  WHERE id = _view_id
    AND visitor_id = _visitor_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_landing_view(uuid, text, integer, boolean, integer) TO anon, authenticated;

-- 2. workspace_invites: hide token column from client SELECT
REVOKE SELECT ON public.workspace_invites FROM anon, authenticated;
GRANT SELECT (id, workspace_id, email, role, invited_by, created_at, accepted_at)
  ON public.workspace_invites TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.workspace_invites TO authenticated;
GRANT ALL ON public.workspace_invites TO service_role;

-- 3. signalhire_searches: add callback_token for webhook authentication
ALTER TABLE public.signalhire_searches
  ADD COLUMN IF NOT EXISTS callback_token text;
