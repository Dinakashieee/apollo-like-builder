CREATE POLICY "Platform admins read suppressed emails"
ON public.suppressed_emails FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins delete suppressed emails"
ON public.suppressed_emails FOR DELETE TO authenticated
USING (public.is_platform_admin(auth.uid()));