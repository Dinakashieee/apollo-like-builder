-- Send-pace tracking: counts emails actually sent today for a workspace
-- (scheduled sends, connected-mailbox outbound messages, and built-in transactional sends).
-- Returns the total sent today and how many were sent in the last 15 minutes.
create or replace function public.workspace_sends_today(_workspace_id uuid)
returns table(total integer, recent integer)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is not null and not public.is_workspace_member(_workspace_id, auth.uid()) then
    raise exception 'forbidden';
  end if;

  return query
  with day_start as (select date_trunc('day', now()) as d),
  alls as (
    select sent_at as at
    from public.scheduled_emails
    where workspace_id = _workspace_id
      and status = 'sent'
      and sent_at >= (select d from day_start)
    union all
    select sent_at as at
    from public.email_messages
    where workspace_id = _workspace_id
      and direction = 'outbound'
      and sent_at >= (select d from day_start)
    union all
    select created_at as at
    from (
      select distinct on (message_id) message_id, created_at
      from public.email_send_log
      where status = 'sent'
        and metadata->>'workspace_id' = _workspace_id::text
        and created_at >= (select d from day_start)
      order by message_id, created_at desc
    ) l
  )
  select count(*)::integer,
         count(*) filter (where at >= now() - interval '15 minutes')::integer
  from alls;
end;
$$;

revoke all on function public.workspace_sends_today(uuid) from public, anon;
grant execute on function public.workspace_sends_today(uuid) to authenticated, service_role;