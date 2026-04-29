-- Reply temperature enum
DO $$ BEGIN
  CREATE TYPE public.reply_temperature AS ENUM ('hot','warm','cold','neutral');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.email_messages
  ADD COLUMN IF NOT EXISTS reply_temperature public.reply_temperature,
  ADD COLUMN IF NOT EXISTS reply_intent text,
  ADD COLUMN IF NOT EXISTS reply_summary text,
  ADD COLUMN IF NOT EXISTS suggested_next_step text,
  ADD COLUMN IF NOT EXISTS analysis_confidence numeric,
  ADD COLUMN IF NOT EXISTS analyzed_at timestamptz;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS last_reply_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_reply_temperature public.reply_temperature,
  ADD COLUMN IF NOT EXISTS reply_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_leads_workspace_last_reply
  ON public.leads (workspace_id, last_reply_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_email_messages_lead_via_thread
  ON public.email_messages (thread_id, direction, sent_at DESC);