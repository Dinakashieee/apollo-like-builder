
DROP POLICY IF EXISTS "Owners can add members" ON public.workspace_members;
CREATE POLICY "Owners can add members"
ON public.workspace_members
FOR INSERT
WITH CHECK (public.is_workspace_owner(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "members read sender settings" ON public.email_sender_settings;
CREATE POLICY "owners read sender settings"
ON public.email_sender_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = email_sender_settings.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role = 'owner'::app_role
  )
);
