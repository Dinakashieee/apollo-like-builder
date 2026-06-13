
-- 1) Remove public direct-table read of landing_pages; rely on get_public_landing_page(slug) RPC.
DROP POLICY IF EXISTS "Public can view published pages" ON public.landing_pages;
DROP POLICY IF EXISTS "Public can view published landing pages" ON public.landing_pages;
REVOKE SELECT ON public.landing_pages FROM anon;

-- 2) Explicitly deny direct inserts to landing_page_views from anon/authenticated.
--    All view logging must go through public.log_landing_view (SECURITY DEFINER).
DROP POLICY IF EXISTS "Block direct inserts to landing_page_views" ON public.landing_page_views;
CREATE POLICY "Block direct inserts to landing_page_views"
  ON public.landing_page_views FOR INSERT TO anon, authenticated
  WITH CHECK (false);

-- 3) Add explicit UPDATE policy on landing-assets storage bucket (mirror INSERT).
DROP POLICY IF EXISTS "Workspace members can update landing assets" ON storage.objects;
CREATE POLICY "Workspace members can update landing assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'landing-assets'
  AND public.is_workspace_member((storage.foldername(name))[1]::uuid, auth.uid())
)
WITH CHECK (
  bucket_id = 'landing-assets'
  AND public.is_workspace_member((storage.foldername(name))[1]::uuid, auth.uid())
);
