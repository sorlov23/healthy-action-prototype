-- Rinlo Supabase sync transport primitives.
-- Applied after rinlo_foundation.sql. These functions preserve the atomic and
-- idempotent semantics already used by the local-first outbox.

begin;

-- Public functions are API surface in Supabase. Make future exposure opt-in.
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

create or replace function public.rinlo_apply_metric_operation(
  p_operation_id text,
  p_day date,
  p_water_ml_delta integer default 0,
  p_steps_delta integer default 0
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_existing public.daily_metric_operations%rowtype;
  v_metrics public.daily_metrics%rowtype;
  v_inserted boolean := false;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_operation_id is null or btrim(p_operation_id) = '' or length(p_operation_id) > 160 then
    raise exception 'invalid_operation_id' using errcode = '22023';
  end if;
  if p_day is null then
    raise exception 'invalid_day' using errcode = '22023';
  end if;
  if abs(coalesce(p_water_ml_delta, 0)) > 20000 or abs(coalesce(p_steps_delta, 0)) > 100000 then
    raise exception 'metric_delta_out_of_range' using errcode = '22023';
  end if;

  insert into public.daily_metric_operations(
    user_id, operation_id, day, water_ml_delta, steps_delta
  ) values (
    v_user_id, p_operation_id, p_day, coalesce(p_water_ml_delta, 0), coalesce(p_steps_delta, 0)
  )
  on conflict (user_id, operation_id) do nothing;
  v_inserted := found;

  if not v_inserted then
    select * into v_existing
    from public.daily_metric_operations
    where user_id = v_user_id and operation_id = p_operation_id;

    if not found
      or v_existing.day <> p_day
      or v_existing.water_ml_delta <> coalesce(p_water_ml_delta, 0)
      or v_existing.steps_delta <> coalesce(p_steps_delta, 0) then
      raise exception 'metric_operation_conflict' using errcode = '23505';
    end if;
  else
    insert into public.daily_metrics(user_id, day, water_ml, steps)
    values(
      v_user_id,
      p_day,
      greatest(0, coalesce(p_water_ml_delta, 0)),
      greatest(0, coalesce(p_steps_delta, 0))
    )
    on conflict(user_id, day) do update set
      water_ml = greatest(0, public.daily_metrics.water_ml + coalesce(p_water_ml_delta, 0)),
      steps = greatest(0, public.daily_metrics.steps + coalesce(p_steps_delta, 0)),
      updated_at = now();
  end if;

  select * into v_metrics
  from public.daily_metrics
  where user_id = v_user_id and day = p_day;

  return jsonb_build_object(
    'day', p_day::text,
    'waterMl', coalesce(v_metrics.water_ml, 0),
    'steps', coalesce(v_metrics.steps, 0),
    'habits', coalesce(v_metrics.habit_flags, '{}'::jsonb),
    'updatedAt', v_metrics.updated_at,
    'replayed', not v_inserted,
    'operationId', p_operation_id
  );
end;
$$;

create or replace function public.rinlo_set_daily_habit(
  p_day date,
  p_habit text,
  p_done boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_metrics public.daily_metrics%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_day is null then
    raise exception 'invalid_day' using errcode = '22023';
  end if;
  if p_habit is null or p_habit not in ('vape', 'fastfood', 'water') then
    raise exception 'invalid_habit' using errcode = '22023';
  end if;
  if p_done is null then
    raise exception 'invalid_done' using errcode = '22023';
  end if;

  insert into public.daily_metrics(user_id, day, habit_flags)
  values(v_user_id, p_day, jsonb_build_object(p_habit, p_done))
  on conflict(user_id, day) do update set
    habit_flags = coalesce(public.daily_metrics.habit_flags, '{}'::jsonb)
      || jsonb_build_object(p_habit, p_done),
    updated_at = now()
  returning * into v_metrics;

  return jsonb_build_object(
    'day', v_metrics.day::text,
    'waterMl', v_metrics.water_ml,
    'steps', v_metrics.steps,
    'habits', v_metrics.habit_flags,
    'updatedAt', v_metrics.updated_at
  );
end;
$$;

revoke all on function public.rinlo_apply_metric_operation(text, date, integer, integer) from public, anon;
revoke all on function public.rinlo_set_daily_habit(date, text, boolean) from public, anon;
grant execute on function public.rinlo_apply_metric_operation(text, date, integer, integer) to authenticated;
grant execute on function public.rinlo_set_daily_habit(date, text, boolean) to authenticated;

commit;
