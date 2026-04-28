alter table public.email_sender_settings
  add column if not exists verification_code text;