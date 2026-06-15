create table if not exists public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  phone text,
  team_size text,
  preferred_time text,
  message text,
  source text,
  created_at timestamptz not null default now()
);

grant insert on public.demo_requests to anon, authenticated;
grant all on public.demo_requests to service_role;

alter table public.demo_requests enable row level security;

create policy "Anyone can submit demo request"
  on public.demo_requests
  for insert
  to anon, authenticated
  with check (
    length(coalesce(name, '')) between 1 and 200
    and length(coalesce(email, '')) between 3 and 320
    and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and length(coalesce(company, '')) <= 200
    and length(coalesce(phone, '')) <= 50
    and length(coalesce(team_size, '')) <= 50
    and length(coalesce(preferred_time, '')) <= 200
    and length(coalesce(message, '')) <= 4000
    and length(coalesce(source, '')) <= 100
  );

create index if not exists demo_requests_created_at_idx
  on public.demo_requests (created_at desc);