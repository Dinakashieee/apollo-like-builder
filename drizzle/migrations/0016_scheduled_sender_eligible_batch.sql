ALTER TABLE public.scheduled_emails ADD COLUMN retry_after timestamptz;
CREATE INDEX scheduled_emails_pending_due_idx ON public.scheduled_emails (scheduled_for, id) WHERE status = 'pending';
CREATE OR REPLACE FUNCTION public.select_due_scheduled_emails(_now timestamptz DEFAULT now()) RETURNS SETOF public.scheduled_emails LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
 SELECT e.* FROM public.scheduled_emails e
 WHERE e.status = 'pending' AND e.scheduled_for <= _now
 AND (e.retry_after IS NULL OR e.retry_after <= _now)
 AND NOT EXISTS (SELECT 1 FROM public.user_email_sending_state s WHERE s.user_id = e.user_id AND s.paused)
 ORDER BY e.scheduled_for, e.id LIMIT 20;
$$;
REVOKE ALL ON FUNCTION public.select_due_scheduled_emails(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.select_due_scheduled_emails(timestamptz) TO service_role;
COMMENT ON COLUMN public.scheduled_emails.retry_after IS 'Transient dispatcher backoff; original scheduled_for is preserved. Paused senders excluded before batch limit.';