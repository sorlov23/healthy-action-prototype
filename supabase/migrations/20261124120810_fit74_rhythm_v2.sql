-- Fit74 2.0: daily energy, voluntary check-ins, restart stages and planned pauses.
create table public.fit74_rhythm_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  energy text check (energy in ('low','mid','high')),
  paused boolean not null default false,
  visited boolean not null default false,
  micro_checkin boolean not null default false,
  restart_stage smallint check (restart_stage between 0 and 3),
  dismissed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id,entry_date)
);
create table public.fit74_rhythm_awards (
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null check (code in ('first','return','balance','night','honest','distance')),
  earned_on date not null default current_date,
  primary key (user_id,code)
);
alter table public.fit74_rhythm_days enable row level security;
alter table public.fit74_rhythm_awards enable row level security;
revoke all on public.fit74_rhythm_days, public.fit74_rhythm_awards from public, anon, authenticated;
grant select,insert,update on public.fit74_rhythm_days to authenticated;
grant select,insert on public.fit74_rhythm_awards to authenticated;
grant select on public.fit74_rhythm_days to service_role;
create policy rhythm_days_read on public.fit74_rhythm_days for select to authenticated using ((select auth.uid())=user_id);
create policy rhythm_days_insert on public.fit74_rhythm_days for insert to authenticated with check ((select auth.uid())=user_id);
create policy rhythm_days_update on public.fit74_rhythm_days for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy rhythm_awards_read on public.fit74_rhythm_awards for select to authenticated using ((select auth.uid())=user_id);
create policy rhythm_awards_insert on public.fit74_rhythm_awards for insert to authenticated with check ((select auth.uid())=user_id);
-- No reminder dispatch during a deliberately paused calendar day.
CREATE OR REPLACE FUNCTION public.fit74_push_claim_due(p_now timestamp with time zone DEFAULT now())
 RETURNS TABLE(endpoint text, p256dh text, auth text, local_date date)
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  with candidates as (
    select s.endpoint, clock.local_now::date as day
    from public.fit74_push_subscriptions s
    join public.fit74_preferences p on p.user_id = s.user_id
    cross join lateral (select timezone(s.time_zone, p_now) as local_now) clock
    cross join lateral (select clock.local_now::date +
      case when p.reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        then p.reminder_time::time else time '21:30' end as scheduled) target
    left join public.fit74_daily_entries e on e.user_id = s.user_id and e.entry_date = clock.local_now::date
    where s.enabled and p.reminder_enabled
      and not exists (select 1 from public.fit74_rhythm_days r where r.user_id=s.user_id and r.entry_date=clock.local_now::date and r.paused)
      and clock.local_now::date between p.start_date and p.end_date
      and clock.local_now >= target.scheduled and clock.local_now < target.scheduled + interval '30 minutes'
      and s.last_sent_date is distinct from clock.local_now::date
      and (s.lease_until is null or s.lease_until <= p_now)
      and (s.attempt_date is distinct from clock.local_now::date or s.attempts < 3)
      and not coalesce(
        (case when e.workout then 2 else 0 end + coalesce(e.nutrition,0) +
         case when e.movement then 1 else 0 end + case when e.water then 1 else 0 end +
         case when e.sleep then 1 else 0 end + case when e.habit_1 then 1 else 0 end +
         case when e.habit_2 then 1 else 0 end + case when e.habit_3 then 1 else 0 end) >= 5
        or (e.minimum_mode and e.movement and e.water and e.habit_3), false)
    order by s.updated_at
    limit 100
    for update of s skip locked
  )
  update public.fit74_push_subscriptions s
    set lease_until = p_now + interval '90 seconds',
        attempts = case when s.attempt_date = c.day then s.attempts + 1 else 1 end,
        attempt_date = c.day, last_status = 'sending'
  from candidates c where s.endpoint = c.endpoint
  returning s.endpoint, s.p256dh, s.auth, c.day;
$function$;
revoke all on function public.fit74_push_claim_due(timestamptz) from public, anon, authenticated;
grant execute on function public.fit74_push_claim_due(timestamptz) to service_role;

