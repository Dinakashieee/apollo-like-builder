create table if not exists public.email_sender_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  mode text not null default 'builtin' check (mode in ('builtin','custom')),
  from_name text,
  from_email text,
  reply_to text,
  verified boolean not null default false,
  last_verification_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_sender_settings enable row level security;

create policy "members read sender settings"
on public.email_sender_settings for select
to authenticated
using (exists (select 1 from public.workspace_members wm where wm.workspace_id = email_sender_settings.workspace_id and wm.user_id = auth.uid()));

create policy "owners insert sender settings"
on public.email_sender_settings for insert
to authenticated
with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = email_sender_settings.workspace_id and wm.user_id = auth.uid() and wm.role = 'owner'));

create policy "owners update sender settings"
on public.email_sender_settings for update
to authenticated
using (exists (select 1 from public.workspace_members wm where wm.workspace_id = email_sender_settings.workspace_id and wm.user_id = auth.uid() and wm.role = 'owner'));

create or replace function public.tg_email_sender_settings_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger set_email_sender_settings_updated_at
before update on public.email_sender_settings
for each row execute function public.tg_email_sender_settings_updated_at();