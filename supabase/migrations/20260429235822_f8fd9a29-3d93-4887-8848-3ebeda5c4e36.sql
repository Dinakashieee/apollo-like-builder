ALTER TABLE public.email_accounts
  ADD CONSTRAINT email_accounts_workspace_email_unique
  UNIQUE (workspace_id, email_address);