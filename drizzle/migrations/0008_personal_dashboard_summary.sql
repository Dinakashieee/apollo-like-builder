CREATE OR REPLACE FUNCTION public.personal_dashboard_summary(_workspace_id uuid, _start timestamptz, _end timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _user uuid := auth.uid(); _result jsonb;
BEGIN
 IF _user IS NULL OR NOT public.is_workspace_member(_workspace_id, _user) THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF _start IS NULL OR _end IS NULL OR _end <= _start OR _end - _start > interval '100 days' THEN RAISE EXCEPTION 'invalid date range'; END IF;
 WITH latest_email AS (
   SELECT DISTINCT ON (message_id) message_id, status, created_at, metadata
   FROM public.email_send_log WHERE message_id IS NOT NULL
   ORDER BY message_id, created_at DESC, id DESC
 ), recent_activity AS (
   SELECT id, type, description, created_at FROM public.activities
   WHERE workspace_id = _workspace_id AND user_id = _user AND NOT is_demo AND created_at >= _start AND created_at < _end
   ORDER BY created_at DESC LIMIT 5
 )
 SELECT jsonb_build_object(
   'leads', (SELECT count(*) FROM public.leads WHERE workspace_id = _workspace_id AND created_by = _user AND NOT is_demo AND created_at >= _start AND created_at < _end),
   'emails_sent', (SELECT count(*) FROM latest_email WHERE status = 'sent' AND metadata->>'sender_user_id' = _user::text AND metadata->>'workspace_id' = _workspace_id::text AND created_at >= _start AND created_at < _end),
   'emails_drafted', (SELECT count(*) FROM public.activities WHERE workspace_id = _workspace_id AND user_id = _user AND NOT is_demo AND type = 'email_generated' AND created_at >= _start AND created_at < _end),
   'landing_pages', (SELECT count(*) FROM public.landing_pages WHERE workspace_id = _workspace_id AND created_by = _user AND created_at >= _start AND created_at < _end),
   'followups_completed', (SELECT count(*) FROM public.follow_up_reminders WHERE workspace_id = _workspace_id AND user_id = _user AND status = 'done' AND updated_at >= _start AND updated_at < _end),
   'activities', COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM recent_activity r), '[]'::jsonb)
 ) INTO _result;
 RETURN _result;
END;
$$;
REVOKE ALL ON FUNCTION public.personal_dashboard_summary(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.personal_dashboard_summary(uuid, timestamptz, timestamptz) TO authenticated, service_role;