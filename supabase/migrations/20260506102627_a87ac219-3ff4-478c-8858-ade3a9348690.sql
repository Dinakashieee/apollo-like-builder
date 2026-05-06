
-- 1. Add phone fields to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS whatsapp_phone text;

-- 2. Scheduled emails
CREATE TABLE IF NOT EXISTS public.scheduled_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  lead_id uuid,
  thread_id uuid,
  in_reply_to_message_id uuid,
  account_id uuid,
  send_via text NOT NULL DEFAULT 'builtin', -- 'connected' | 'builtin' | 'mailto'
  to_email text NOT NULL,
  subject text,
  body text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | sent | failed | canceled
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_due ON public.scheduled_emails(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_workspace ON public.scheduled_emails(workspace_id);
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read scheduled emails" ON public.scheduled_emails
  FOR SELECT TO authenticated USING (is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members create scheduled emails" ON public.scheduled_emails
  FOR INSERT TO authenticated WITH CHECK (is_workspace_member(workspace_id, auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Members update scheduled emails" ON public.scheduled_emails
  FOR UPDATE TO authenticated USING (is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members delete scheduled emails" ON public.scheduled_emails
  FOR DELETE TO authenticated USING (is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Service role manages scheduled emails" ON public.scheduled_emails
  FOR ALL TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_scheduled_emails_updated_at
  BEFORE UPDATE ON public.scheduled_emails
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. WhatsApp messages
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  user_id uuid,
  direction text NOT NULL, -- 'inbound' | 'outbound'
  phone text NOT NULL,
  body text NOT NULL,
  phone_matches_lead boolean NOT NULL DEFAULT false,
  sent_via text, -- 'twilio' | 'click_to_chat' | 'manual'
  twilio_sid text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_lead ON public.whatsapp_messages(lead_id, sent_at DESC);
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read whatsapp" ON public.whatsapp_messages
  FOR SELECT TO authenticated USING (is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members create whatsapp" ON public.whatsapp_messages
  FOR INSERT TO authenticated WITH CHECK (is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members delete whatsapp" ON public.whatsapp_messages
  FOR DELETE TO authenticated USING (is_workspace_member(workspace_id, auth.uid()));

-- 4. Follow-up reminders
CREATE TABLE IF NOT EXISTS public.follow_up_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  lead_id uuid,
  thread_id uuid,
  source_message_id uuid,
  user_id uuid,
  due_at timestamptz NOT NULL,
  note text,
  source text NOT NULL DEFAULT 'auto', -- 'auto' | 'manual'
  status text NOT NULL DEFAULT 'pending', -- pending | done | dismissed
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_follow_up_due ON public.follow_up_reminders(workspace_id, status, due_at);
ALTER TABLE public.follow_up_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read reminders" ON public.follow_up_reminders
  FOR SELECT TO authenticated USING (is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members create reminders" ON public.follow_up_reminders
  FOR INSERT TO authenticated WITH CHECK (is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members update reminders" ON public.follow_up_reminders
  FOR UPDATE TO authenticated USING (is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Members delete reminders" ON public.follow_up_reminders
  FOR DELETE TO authenticated USING (is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Service role manages reminders" ON public.follow_up_reminders
  FOR ALL TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_follow_up_reminders_updated_at
  BEFORE UPDATE ON public.follow_up_reminders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
