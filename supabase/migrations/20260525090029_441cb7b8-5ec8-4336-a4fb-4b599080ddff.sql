DROP POLICY IF EXISTS "Members create notifications" ON public.notifications;

CREATE POLICY "Members create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  is_workspace_member(workspace_id, auth.uid())
  AND (user_id IS NULL OR user_id = auth.uid())
);