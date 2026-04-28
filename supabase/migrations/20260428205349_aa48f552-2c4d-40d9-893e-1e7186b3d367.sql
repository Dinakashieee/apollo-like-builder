ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS systems_in_use text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS pain_points text[] DEFAULT '{}'::text[];

ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS target_systems text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS solved_pain_points text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS positioning text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_signature text,
  ADD COLUMN IF NOT EXISTS sender_email text,
  ADD COLUMN IF NOT EXISTS sender_name text,
  ADD COLUMN IF NOT EXISTS preferred_mail_client text DEFAULT 'default';