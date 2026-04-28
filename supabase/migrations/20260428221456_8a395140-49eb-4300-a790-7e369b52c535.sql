
-- Platform admins table (separate from workspace ownership)
CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Security definer to check platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _user_id);
$$;

-- Only platform admins can see the admin list
CREATE POLICY "Platform admins read admins"
  ON public.platform_admins FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Seed the first user as platform admin
INSERT INTO public.platform_admins (user_id)
VALUES ('24fece32-03c9-4317-a445-f43db2397b52')
ON CONFLICT DO NOTHING;

-- Allow platform admins to read ALL tickets (in addition to user-owned access)
CREATE POLICY "Platform admins read all tickets"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins update all tickets"
  ON public.tickets FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Replace the workspace-owner-based waitlist read policy with platform-admin-based
DROP POLICY IF EXISTS "Admins read waitlist" ON public.waitlist_signups;
DROP POLICY IF EXISTS "Admins update waitlist" ON public.waitlist_signups;
DROP POLICY IF EXISTS "Admins delete waitlist" ON public.waitlist_signups;

CREATE POLICY "Platform admins read waitlist"
  ON public.waitlist_signups FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins update waitlist"
  ON public.waitlist_signups FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins delete waitlist"
  ON public.waitlist_signups FOR DELETE
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));
