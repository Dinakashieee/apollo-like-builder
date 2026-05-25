DROP POLICY IF EXISTS "Members update own notifications" ON public.notifications;

CREATE POLICY "Members update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  public.is_workspace_member(workspace_id, auth.uid())
  AND ((user_id IS NULL) OR (user_id = auth.uid()))
)
WITH CHECK (
  public.is_workspace_member(workspace_id, auth.uid())
  AND ((user_id IS NULL) OR (user_id = auth.uid()))
);