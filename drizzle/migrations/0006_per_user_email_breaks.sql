CREATE TABLE public.user_email_sending_state (
 user_id uuid PRIMARY KEY,
 paused boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_email_sending_state TO authenticated;
GRANT ALL ON public.user_email_sending_state TO service_role;
ALTER TABLE public.user_email_sending_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_sending_state_select ON public.user_email_sending_state FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY own_sending_state_insert ON public.user_email_sending_state FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY own_sending_state_update ON public.user_email_sending_state FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
COMMENT ON TABLE public.user_email_sending_state IS 'Individual outreach sending break; remains paused until the user explicitly resumes. Authentication and essential system mail are not paused.';