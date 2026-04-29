create table if not exists public.workspace_addons (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  user_id uuid not null,
  paddle_subscription_id text not null unique,
  paddle_customer_id text not null,
  product_id text not null,
  price_id text not null,
  quantity integer not null default 1,
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  environment text not null default 'sandbox',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ws_addons_workspace on public.workspace_addons(workspace_id);
create index if not exists idx_ws_addons_user on public.workspace_addons(user_id);

alter table public.workspace_addons enable row level security;

create policy "Members read addons"
  on public.workspace_addons for select
  to authenticated
  using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Service role manages addons"
  on public.workspace_addons for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function public.workspace_extra_seats(_workspace_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(quantity), 0)::int
  from public.workspace_addons
  where workspace_id = _workspace_id
    and product_id = 'addon_seat'
    and status in ('active','trialing','past_due')
    and (current_period_end is null or current_period_end > now());
$$;

create or replace function public.workspace_extra_credits(_workspace_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(
    case product_id
      when 'addon_credits_1k' then 1000 * quantity
      when 'addon_credits_5k' then 5000 * quantity
      else 0
    end
  ), 0)::int
  from public.workspace_addons
  where workspace_id = _workspace_id
    and status in ('active','trialing','past_due')
    and (current_period_end is null or current_period_end > now());
$$;