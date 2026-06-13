
CREATE POLICY "Workspace members can upload landing assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'landing-assets'
  AND public.is_workspace_member((storage.foldername(name))[1]::uuid, auth.uid())
);

CREATE POLICY "Workspace members can read landing assets"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'landing-assets'
  AND public.is_workspace_member((storage.foldername(name))[1]::uuid, auth.uid())
);

CREATE POLICY "Workspace members can delete landing assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'landing-assets'
  AND public.is_workspace_member((storage.foldername(name))[1]::uuid, auth.uid())
);
