REVOKE SELECT ON public.ad_campaigns FROM authenticated;
GRANT SELECT (id, workspace_id, name, platform, auto_created, created_by, created_at) ON public.ad_campaigns TO authenticated;