-- Waitlist status enum
DO $$ BEGIN
  CREATE TYPE public.waitlist_status AS ENUM ('waiting', 'invited', 'converted', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Helper: is the current user an owner of any workspace (i.e. an admin)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces WHERE owner_id = _user_id
  );
$$;

CREATE TABLE public.waitlist_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  designation TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT NOT NULL,
  notes TEXT,
  status public.waitlist_status NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_waitlist_email ON public.waitlist_signups (lower(email));
CREATE INDEX idx_waitlist_status ON public.waitlist_signups (status);
CREATE INDEX idx_waitlist_created_at ON public.waitlist_signups (created_at DESC);

ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Anyone (anonymous + authenticated) can submit
CREATE POLICY "Anyone can join waitlist"
ON public.waitlist_signups
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can read
CREATE POLICY "Admins read waitlist"
ON public.waitlist_signups
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Only admins can update
CREATE POLICY "Admins update waitlist"
ON public.waitlist_signups
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Only admins can delete
CREATE POLICY "Admins delete waitlist"
ON public.waitlist_signups
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- updated_at trigger
CREATE TRIGGER waitlist_set_updated_at
BEFORE UPDATE ON public.waitlist_signups
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();