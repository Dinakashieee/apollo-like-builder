REVOKE ALL ON public.career_applications FROM anon, authenticated;
GRANT INSERT (full_name,email,phone,location,profile_url,introduction,consent) ON public.career_applications TO anon, authenticated;
GRANT SELECT ON public.career_applications TO authenticated;
GRANT ALL ON public.career_applications TO service_role;