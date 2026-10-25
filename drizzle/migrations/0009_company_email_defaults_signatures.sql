ALTER TABLE public.company_profiles ADD COLUMN email_context jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN default_email_signature_id uuid;
CREATE TABLE public.email_signatures (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
 name text NOT NULL, content text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT signature_name_length CHECK (length(trim(name)) BETWEEN 1 AND 80),
 CONSTRAINT signature_content_length CHECK (length(content) BETWEEN 1 AND 20000)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_signatures TO authenticated;
GRANT ALL ON public.email_signatures TO service_role;
ALTER TABLE public.email_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_signatures_select ON public.email_signatures FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY own_signatures_insert ON public.email_signatures FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY own_signatures_update ON public.email_signatures FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY own_signatures_delete ON public.email_signatures FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX email_signatures_user_idx ON public.email_signatures(user_id);
CREATE TRIGGER signature_updated_at BEFORE UPDATE ON public.email_signatures FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();