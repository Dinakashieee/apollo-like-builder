CREATE OR REPLACE FUNCTION public.can_customize_landing(_workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT auth.uid() IS NOT NULL AND public.is_workspace_member(_workspace_id, auth.uid()); $$;
COMMENT ON FUNCTION public.can_customize_landing(uuid) IS 'Temporary feature access: all authenticated workspace members can customize landing designs. Subscription tiers and AI/contact usage quotas are unchanged.';
REVOKE ALL ON FUNCTION public.can_customize_landing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_customize_landing(uuid) TO authenticated, service_role;