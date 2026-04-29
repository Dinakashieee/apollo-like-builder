-- Email account providers
CREATE TYPE public.email_account_provider AS ENUM ('gmail', 'outlook');
CREATE TYPE public.email_message_direction AS ENUM ('outbound', 'inbound');

-- Per-user connected mailbox accounts
CREATE TABLE public.email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  provider public.email_account_provider NOT NULL,
  email_address TEXT NOT NULL,
  display_name TEXT,
  -- OAuth tokens (refresh stored encrypted via pgsodium would be ideal; for now store directly, edge fns are the only readers via service role)
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  -- Microsoft Graph specifics
  ms_tenant_id TEXT,
  ms_subscription_id TEXT,
  ms_subscription_expires_at TIMESTAMPTZ,
  -- Gmail specifics
  gmail_history_id TEXT,
  gmail_watch_expires_at TIMESTAMPTZ,
  -- State
  status TEXT NOT NULL DEFAULT 'active', -- active | disconnected | error
  last_error TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider, email_address)
);
CREATE INDEX idx_email_accounts_workspace ON public.email_accounts (workspace_id);
CREATE INDEX idx_email_accounts_user ON public.email_accounts (user_id);

-- Conversation threads
CREATE TABLE public.email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  lead_id UUID,
  account_id UUID NOT NULL REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  -- Provider thread identifiers
  provider_thread_id TEXT NOT NULL, -- gmail threadId / outlook conversationId
  subject TEXT,
  participants TEXT[] NOT NULL DEFAULT '{}',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, provider_thread_id)
);
CREATE INDEX idx_email_threads_workspace ON public.email_threads (workspace_id);
CREATE INDEX idx_email_threads_lead ON public.email_threads (lead_id);
CREATE INDEX idx_email_threads_last_msg ON public.email_threads (workspace_id, last_message_at DESC);

-- Individual messages
CREATE TABLE public.email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  thread_id UUID NOT NULL REFERENCES public.email_threads(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  direction public.email_message_direction NOT NULL,
  -- Provider message identifiers
  provider_message_id TEXT NOT NULL,
  rfc822_message_id TEXT, -- Message-ID header for threading
  in_reply_to TEXT,
  -- Headers
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_emails TEXT[] NOT NULL DEFAULT '{}',
  cc_emails TEXT[] NOT NULL DEFAULT '{}',
  subject TEXT,
  snippet TEXT,
  body_text TEXT,
  body_html TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, provider_message_id)
);
CREATE INDEX idx_email_messages_thread ON public.email_messages (thread_id, sent_at DESC);
CREATE INDEX idx_email_messages_workspace ON public.email_messages (workspace_id, sent_at DESC);

-- Triggers for updated_at
CREATE TRIGGER trg_email_accounts_updated BEFORE UPDATE ON public.email_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_email_threads_updated BEFORE UPDATE ON public.email_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

-- email_accounts: members read; user can insert/delete their own account; service role manages tokens
CREATE POLICY "Members read email accounts" ON public.email_accounts
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "User inserts own email account" ON public.email_accounts
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
    AND auth.uid() = user_id
  );

CREATE POLICY "User updates own email account" ON public.email_accounts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "User deletes own email account" ON public.email_accounts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages email accounts" ON public.email_accounts
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- email_threads: members read; service role + members write
CREATE POLICY "Members read email threads" ON public.email_threads
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members create email threads" ON public.email_threads
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members update email threads" ON public.email_threads
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Service role manages threads" ON public.email_threads
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- email_messages: members read; service role writes (inbound); members can insert outbound via send fn
CREATE POLICY "Members read email messages" ON public.email_messages
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Service role manages messages" ON public.email_messages
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_threads;