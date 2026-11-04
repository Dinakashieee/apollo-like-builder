CREATE TABLE public.career_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 role text NOT NULL DEFAULT 'Lead Generation Intern' CHECK (role = 'Lead Generation Intern'),
 full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
 email text NOT NULL CHECK (char_length(email) <= 254 AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 phone text NOT NULL CHECK (char_length(phone) BETWEEN 7 AND 30),
 location text NOT NULL CHECK (char_length(location) BETWEEN 2 AND 120),
 profile_url text CHECK (profile_url IS NULL OR (char_length(profile_url) <= 1000 AND profile_url ~ '^https://')),
 introduction text NOT NULL CHECK (char_length(introduction) BETWEEN 20 AND 4000),
 consent boolean NOT NULL CHECK (consent = true),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT (full_name,email,phone,location,profile_url,introduction,consent) ON public.career_applications TO anon, authenticated;
GRANT SELECT ON public.career_applications TO authenticated;
GRANT ALL ON public.career_applications TO service_role;
ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Applicants can submit validated applications" ON public.career_applications FOR INSERT TO anon, authenticated WITH CHECK (role = 'Lead Generation Intern' AND consent = true);
CREATE POLICY "Platform admins can read applications" ON public.career_applications FOR SELECT TO authenticated USING (public.is_platform_admin(auth.uid()));