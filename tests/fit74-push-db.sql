-- Run as the migration owner. All fixture changes are rolled back, including leases.
begin;
do $test$
declare
  fixture_user uuid;
  target text := 'https://web.push.apple.com/fit74-transaction-only-test';
  result_count integer;
begin
  select user_id into strict fixture_user from public.fit74_preferences limit 1;
  update public.fit74_preferences set start_date='2026-11-04',end_date='2026-12-06',
    reminder_enabled=true,reminder_time='21:30' where user_id=fixture_user;
  insert into public.fit74_daily_entries(user_id,entry_date,workout,nutrition,movement,water,sleep,habit_1,habit_2,habit_3,minimum_mode)
  values(fixture_user,'2026-11-04',false,0,false,false,false,false,false,false,false)
  on conflict(user_id,entry_date) do update set workout=false,nutrition=0,movement=false,water=false,sleep=false,
    habit_1=false,habit_2=false,habit_3=false,minimum_mode=false;
  insert into public.fit74_push_subscriptions(endpoint,user_id,p256dh,auth) values(target,fixture_user,'fixture','fixture');

  select count(*) into result_count from public.fit74_push_claim_due('2026-11-04T18:29:00Z') where endpoint=target;
  if result_count<>0 then raise exception 'Sent before 21:30 Moscow'; end if;
  select count(*) into result_count from public.fit74_push_claim_due('2026-11-04T18:30:00Z') where endpoint=target;
  if result_count<>1 then raise exception 'Did not claim at 21:30 Moscow'; end if;
  select count(*) into result_count from public.fit74_push_claim_due('2026-11-04T18:30:10Z') where endpoint=target;
  if result_count<>0 then raise exception 'Duplicate concurrent claim'; end if;
  perform public.fit74_push_claim_due('2026-11-04T18:32:00Z');
  perform public.fit74_push_claim_due('2026-11-04T18:34:00Z');
  select count(*) into result_count from public.fit74_push_claim_due('2026-11-04T18:36:00Z') where endpoint=target;
  if result_count<>0 then raise exception 'Retry limit exceeded'; end if;
  update public.fit74_push_subscriptions set last_sent_date='2026-11-04',lease_until=null,attempts=0 where endpoint=target;
  select count(*) into result_count from public.fit74_push_claim_due('2026-11-04T18:37:00Z') where endpoint=target;
  if result_count<>0 then raise exception 'Same-day duplicate after delivery'; end if;
  update public.fit74_push_subscriptions set last_sent_date=null,attempts=0 where endpoint=target;

  update public.fit74_daily_entries set workout=true,nutrition=2,movement=true where user_id=fixture_user and entry_date='2026-11-04';
  select count(*) into result_count from public.fit74_push_claim_due('2026-11-04T18:38:00Z') where endpoint=target;
  if result_count<>0 then raise exception 'Reminder after normal completion'; end if;
  update public.fit74_daily_entries set workout=false,nutrition=0,movement=true,water=true,habit_3=true,minimum_mode=true where user_id=fixture_user and entry_date='2026-11-04';
  select count(*) into result_count from public.fit74_push_claim_due('2026-11-04T18:39:00Z') where endpoint=target;
  if result_count<>0 then raise exception 'Reminder after gentle completion'; end if;
  update public.fit74_daily_entries set movement=false,water=false,habit_3=false,minimum_mode=false where user_id=fixture_user and entry_date='2026-11-04';
  update public.fit74_preferences set reminder_enabled=false where user_id=fixture_user;
  select count(*) into result_count from public.fit74_push_claim_due('2026-11-04T18:40:00Z') where endpoint=target;
  if result_count<>0 then raise exception 'Reminder disabled in preferences'; end if;
  update public.fit74_preferences set reminder_enabled=true where user_id=fixture_user;
  update public.fit74_push_subscriptions set enabled=false where endpoint=target;
  select count(*) into result_count from public.fit74_push_claim_due('2026-11-04T18:41:00Z') where endpoint=target;
  if result_count<>0 then raise exception 'Disabled device received reminder'; end if;
  update public.fit74_push_subscriptions set enabled=true where endpoint=target;
  select count(*) into result_count from public.fit74_push_claim_due('2026-11-04T19:00:00Z') where endpoint=target;
  if result_count<>0 then raise exception 'Stale reminder outside 30-minute window'; end if;
  select count(*) into result_count from public.fit74_push_claim_due('2026-12-07T18:30:00Z') where endpoint=target;
  if result_count<>0 then raise exception 'Reminder after plan end'; end if;
  select count(*) into result_count from public.fit74_push_claim_due('2026-11-05T18:30:00Z') where endpoint=target;
  if result_count<>1 then raise exception 'New day failed to reset retry state'; end if;
  if has_table_privilege('anon','public.fit74_push_config','select') or
     has_table_privilege('authenticated','public.fit74_push_config','select') or
     has_table_privilege('authenticated','public.fit74_push_subscriptions','select') or
     has_function_privilege('anon','public.fit74_push_claim_due(timestamptz)','execute') or
     has_function_privilege('authenticated','public.fit74_push_claim_due(timestamptz)','execute') then
    raise exception 'Client role can access private push infrastructure';
  end if;
end;
$test$;
rollback;
select 'passed: Moscow 21:30, leases, retries, deduplication, completion, plan dates, permissions; fixtures rolled back' as result;
