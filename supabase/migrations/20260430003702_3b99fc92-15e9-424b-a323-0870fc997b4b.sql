
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.sequences ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.sequence_steps ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.sequence_enrollments ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.email_accounts ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.email_threads ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.email_messages ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS demo_seeded_at timestamptz;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS demo_banner_dismissed_at timestamptz;

-- Helpful indexes for the cleanup query
CREATE INDEX IF NOT EXISTS idx_leads_workspace_demo ON public.leads(workspace_id) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_email_messages_workspace_demo ON public.email_messages(workspace_id) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_activities_workspace_demo ON public.activities(workspace_id) WHERE is_demo = true;

-- Mark the previously-seeded test rows for the Majis workspace as demo
UPDATE public.email_accounts SET is_demo = true WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
UPDATE public.email_threads SET is_demo = true WHERE id IN (
  'bbbbbbb1-0000-0000-0000-000000000001',
  'bbbbbbb1-0000-0000-0000-000000000002',
  'bbbbbbb1-0000-0000-0000-000000000003'
);
UPDATE public.email_messages SET is_demo = true WHERE thread_id IN (
  'bbbbbbb1-0000-0000-0000-000000000001',
  'bbbbbbb1-0000-0000-0000-000000000002',
  'bbbbbbb1-0000-0000-0000-000000000003'
);
