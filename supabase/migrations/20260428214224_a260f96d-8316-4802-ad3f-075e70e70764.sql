
create table public.sequences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sequences_workspace_idx on public.sequences(workspace_id);
alter table public.sequences enable row level security;
create policy "Members read sequences" on public.sequences for select to authenticated using (is_workspace_member(workspace_id, auth.uid()));
create policy "Members create sequences" on public.sequences for insert to authenticated with check (is_workspace_member(workspace_id, auth.uid()));
create policy "Members update sequences" on public.sequences for update to authenticated using (is_workspace_member(workspace_id, auth.uid()));
create policy "Members delete sequences" on public.sequences for delete to authenticated using (is_workspace_member(workspace_id, auth.uid()));
create trigger sequences_updated before update on public.sequences for each row execute function public.set_updated_at();

create table public.sequence_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.sequences(id) on delete cascade,
  workspace_id uuid not null,
  step_order int not null,
  day_offset int not null default 0,
  subject_template text not null default '',
  body_template text not null default '',
  created_at timestamptz not null default now()
);
create index sequence_steps_seq_idx on public.sequence_steps(sequence_id, step_order);
alter table public.sequence_steps enable row level security;
create policy "Members read steps" on public.sequence_steps for select to authenticated using (is_workspace_member(workspace_id, auth.uid()));
create policy "Members create steps" on public.sequence_steps for insert to authenticated with check (is_workspace_member(workspace_id, auth.uid()));
create policy "Members update steps" on public.sequence_steps for update to authenticated using (is_workspace_member(workspace_id, auth.uid()));
create policy "Members delete steps" on public.sequence_steps for delete to authenticated using (is_workspace_member(workspace_id, auth.uid()));

create type public.enrollment_status as enum ('active','paused','completed','stopped');

create table public.sequence_enrollments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  sequence_id uuid not null references public.sequences(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  status public.enrollment_status not null default 'active',
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sequence_id, lead_id)
);
create index enrollments_workspace_idx on public.sequence_enrollments(workspace_id);
create index enrollments_lead_idx on public.sequence_enrollments(lead_id);
alter table public.sequence_enrollments enable row level security;
create policy "Members read enrollments" on public.sequence_enrollments for select to authenticated using (is_workspace_member(workspace_id, auth.uid()));
create policy "Members create enrollments" on public.sequence_enrollments for insert to authenticated with check (is_workspace_member(workspace_id, auth.uid()));
create policy "Members update enrollments" on public.sequence_enrollments for update to authenticated using (is_workspace_member(workspace_id, auth.uid()));
create policy "Members delete enrollments" on public.sequence_enrollments for delete to authenticated using (is_workspace_member(workspace_id, auth.uid()));
create trigger enrollments_updated before update on public.sequence_enrollments for each row execute function public.set_updated_at();

create type public.step_status as enum ('pending','sent','skipped');

create table public.sequence_step_status (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.sequence_enrollments(id) on delete cascade,
  step_id uuid not null references public.sequence_steps(id) on delete cascade,
  workspace_id uuid not null,
  due_at timestamptz not null,
  status public.step_status not null default 'pending',
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enrollment_id, step_id)
);
create index step_status_workspace_idx on public.sequence_step_status(workspace_id);
create index step_status_due_idx on public.sequence_step_status(due_at) where status = 'pending';
alter table public.sequence_step_status enable row level security;
create policy "Members read step status" on public.sequence_step_status for select to authenticated using (is_workspace_member(workspace_id, auth.uid()));
create policy "Members create step status" on public.sequence_step_status for insert to authenticated with check (is_workspace_member(workspace_id, auth.uid()));
create policy "Members update step status" on public.sequence_step_status for update to authenticated using (is_workspace_member(workspace_id, auth.uid()));
create policy "Members delete step status" on public.sequence_step_status for delete to authenticated using (is_workspace_member(workspace_id, auth.uid()));
create trigger step_status_updated before update on public.sequence_step_status for each row execute function public.set_updated_at();
