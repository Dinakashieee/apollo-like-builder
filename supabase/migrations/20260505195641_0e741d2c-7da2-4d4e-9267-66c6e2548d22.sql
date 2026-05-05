
-- 1. Restrict profiles SELECT to self + workspace teammates
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;

CREATE POLICY "Users read own or teammate profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.workspace_members wm1
    JOIN public.workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = auth.uid()
      AND wm2.user_id = profiles.id
  )
  OR public.is_platform_admin(auth.uid())
);

-- 2. Restrict email_accounts SELECT to the owning user only (was: any workspace member,
--    which exposed access_token / refresh_token to teammates)
DROP POLICY IF EXISTS "Members read email accounts" ON public.email_accounts;

CREATE POLICY "User reads own email accounts"
ON public.email_accounts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. Restrict workspace_invites SELECT to workspace owners (token column was readable by all members)
DROP POLICY IF EXISTS "Members view invites" ON public.workspace_invites;

CREATE POLICY "Owners view invites"
ON public.workspace_invites
FOR SELECT
TO authenticated
USING (public.is_workspace_owner(workspace_id, auth.uid()));
