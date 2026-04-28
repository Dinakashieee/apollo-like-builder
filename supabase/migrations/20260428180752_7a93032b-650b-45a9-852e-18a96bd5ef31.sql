-- Usage counters per workspace per month
create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  period_start date not null,
  ai_emails_used integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, period_start)
);

create index if not exists idx_usage_counters_ws on public.usage_counters(workspace_id, period_start);

alter table public.usage_counters enable row level security;

create policy "Members read usage" on public.usage_counters
  for select to authenticated
  using (public.is_workspace_member(workspace_id, auth.uid()));

-- Service role only writes (no policy needed; service_role bypasses RLS)

-- Tier resolution: returns free/starter/pro for a user, checking both envs
create or replace function public.get_user_tier(_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1 from public.subscriptions
      where user_id = _user_id
        and product_id = 'pro_plan'
        and (
          (status in ('active','trialing','past_due')
            and (current_period_end is null or current_period_end > now()))
          or (status = 'canceled' and current_period_end > now())
        )
    ) then 'pro'
    when exists (
      select 1 from public.subscriptions
      where user_id = _user_id
        and product_id = 'starter_plan'
        and (
          (status in ('active','trialing','past_due')
            and (current_period_end is null or current_period_end > now()))
          or (status = 'canceled' and current_period_end > now())
        )
    ) then 'starter'
    else 'free'
  end;
$$;

create or replace function public.get_workspace_owner_tier(_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.get_user_tier(owner_id) from public.workspaces where id = _workspace_id;
$$;

create or replace function public.current_lead_count(_workspace_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.leads where workspace_id = _workspace_id;
$$;

create or replace function public.increment_ai_emails(_workspace_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_period date := date_trunc('month', now())::date;
  new_count integer;
begin
  insert into public.usage_counters (workspace_id, period_start, ai_emails_used)
  values (_workspace_id, current_period, 1)
  on conflict (workspace_id, period_start)
  do update set ai_emails_used = public.usage_counters.ai_emails_used + 1,
                updated_at = now()
  returning ai_emails_used into new_count;
  return new_count;
end;
$$;

create or replace function public.get_current_ai_emails(_workspace_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(ai_emails_used, 0)
  from public.usage_counters
  where workspace_id = _workspace_id
    and period_start = date_trunc('month', now())::date;
$$;