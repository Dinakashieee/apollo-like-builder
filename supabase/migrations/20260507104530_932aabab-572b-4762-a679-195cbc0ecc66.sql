
DROP POLICY IF EXISTS "owners read sender settings" ON public.email_sender_settings;
CREATE POLICY "owners read sender settings"
ON public.email_sender_settings
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = email_sender_settings.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role = 'owner'::app_role
));

CREATE POLICY "Members delete activities"
ON public.activities
FOR DELETE
TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
