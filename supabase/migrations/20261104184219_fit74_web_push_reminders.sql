-- Dedicated Web Push infrastructure. Existing preferences, plan dates and entries stay intact.
create extension if not exists pg_cron;
create extension if not exists pg_net;

create table public.fit74_push_config (
  id integer primary key check (id = 1),
  scheduler_secret text not null default encode(sha256((gen_random_uuid()::text || gen_random_uuid()::text)::bytea), 'hex'),
  vapid_public text,
  vapid_private text,
  last_run_at timestamptz,
  last_result jsonb
);
alter table public.fit74_push_config enable row level security;
revoke all on public.fit74_push_config from public, anon, authenticated;
grant select, insert, update, delete on public.fit74_push_config to service_role;
insert into public.fit74_push_config (id) values (1);

create table public.fit74_push_subscriptions (
  endpoint text primary key check (length(endpoint) <= 4096),
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  time_zone text not null default 'Europe/Moscow' check (time_zone = 'Europe/Moscow'),
  enabled boolean not null default true,
  last_sent_date date,
  attempt_date date,
  attempts integer not null default 0,
  lease_until timestamptz,
  last_test_at timestamptz,
  last_status text not null default 'connected',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index fit74_push_subscriptions_user_idx on public.fit74_push_subscriptions(user_id);
alter table public.fit74_push_subscriptions enable row level security;
-- All device operations go through the Edge Function, which validates the user's access token.
revoke all on public.fit74_push_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on public.fit74_push_subscriptions to service_role;

create function public.fit74_push_claim_due(p_now timestamptz default now())
returns table(endpoint text, p256dh text, auth text, local_date date)
language sql volatile security invoker set search_path = ''
as $$
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
$$;
revoke all on function public.fit74_push_claim_due(timestamptz) from public, anon, authenticated;
grant execute on function public.fit74_push_claim_due(timestamptz) to service_role;

-- Do not let client roles read transient HTTP request headers containing the dispatch credential.
revoke all on net.http_request_queue from public, anon, authenticated;
revoke all on net._http_response from public, anon, authenticated;

select cron.schedule('fit74-push-every-minute', '* * * * *', $cron$
  select net.http_post(
    url := 'https://dllanxwrezqqufgzucuc.supabase.co/functions/v1/fit74-push',
    headers := jsonb_build_object('Content-Type','application/json','x-fit74-scheduler',scheduler_secret),
    body := '{"action":"dispatch"}'::jsonb,
    timeout_milliseconds := 55000
  ) from public.fit74_push_config where id = 1;
$cron$);
