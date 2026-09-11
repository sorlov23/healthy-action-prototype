-- Rinlo Supabase durable action persistence.
-- Applied after rinlo_foundation.sql and rinlo_sync_transport.sql.

begin;

alter table public.rinlo_actions
  add column if not exists client_action_id text;

create unique index if not exists rinlo_actions_user_client_action_id_uidx
  on public.rinlo_actions(user_id, client_action_id)
  where client_action_id is not null;

-- At most one actionable recommendation may be active for a user/day.
create unique index if not exists rinlo_actions_one_active_per_day_uidx
  on public.rinlo_actions(user_id, day)
  where status in ('suggested', 'accepted');

alter table public.rinlo_action_events
  add column if not exists operation_id text;

create unique index if not exists rinlo_action_events_user_operation_id_uidx
  on public.rinlo_action_events(user_id, operation_id)
  where operation_id is not null;

create or replace function public.rinlo_import_action(
  p_client_action_id text,
  p_day date,
  p_kind text,
  p_title text,
  p_rationale text,
  p_effort_minutes integer default null,
  p_context jsonb default '{}'::jsonb,
  p_suggested_at timestamptz default now()
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_action public.rinlo_actions%rowtype;
  v_replayed boolean := false;
  v_reused boolean := false;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_client_action_id is null or btrim(p_client_action_id) = '' or length(p_client_action_id) > 180 then
    raise exception 'invalid_client_action_id' using errcode = '22023';
  end if;
  if p_day is null then
    raise exception 'invalid_day' using errcode = '22023';
  end if;
  if p_kind is null or p_kind not in ('movement','nutrition','recovery','hydration','sleep','nicotine','general') then
    raise exception 'invalid_action_kind' using errcode = '22023';
  end if;
  if p_title is null or btrim(p_title) = '' or length(p_title) > 500 then
    raise exception 'invalid_action_title' using errcode = '22023';
  end if;
  if p_rationale is null or btrim(p_rationale) = '' or length(p_rationale) > 3000 then
    raise exception 'invalid_action_rationale' using errcode = '22023';
  end if;
  if p_effort_minutes is not null and (p_effort_minutes < 1 or p_effort_minutes > 240) then
    raise exception 'invalid_effort_minutes' using errcode = '22023';
  end if;

  select * into v_action
  from public.rinlo_actions
  where user_id = v_user_id and client_action_id = p_client_action_id
  limit 1;

  if found then
    if v_action.day <> p_day
      or v_action.kind <> p_kind
      or v_action.title <> p_title
      or v_action.rationale <> p_rationale
      or v_action.effort_minutes is distinct from p_effort_minutes
      or coalesce(v_action.context, '{}'::jsonb) <> coalesce(p_context, '{}'::jsonb) then
      raise exception 'action_import_conflict' using errcode = '23505';
    end if;
    v_replayed := true;
  else
    -- A second device may already have created the active action for this day.
    select * into v_action
    from public.rinlo_actions
    where user_id = v_user_id
      and day = p_day
      and status in ('suggested','accepted')
    order by suggested_at desc
    limit 1;

    if found then
      v_reused := true;
    else
      begin
        insert into public.rinlo_actions(
          user_id, day, kind, title, rationale, effort_minutes,
          source, context, suggested_at, client_action_id
        ) values (
          v_user_id, p_day, p_kind, btrim(p_title), btrim(p_rationale),
          p_effort_minutes, 'rules', coalesce(p_context, '{}'::jsonb),
          coalesce(p_suggested_at, now()), p_client_action_id
        )
        returning * into v_action;

        insert into public.rinlo_action_events(
          user_id, action_id, event_type, payload, operation_id
        ) values (
          v_user_id, v_action.id, 'shown', '{}'::jsonb,
          'shown:' || p_client_action_id
        );
      exception when unique_violation then
        select * into v_action
        from public.rinlo_actions
        where user_id = v_user_id
          and (
            client_action_id = p_client_action_id
            or (day = p_day and status in ('suggested','accepted'))
          )
        order by (client_action_id = p_client_action_id) desc, suggested_at desc
        limit 1;
        if not found then raise; end if;
        v_reused := v_action.client_action_id is distinct from p_client_action_id;
        v_replayed := not v_reused;
      end;
    end if;
  end if;

  return jsonb_build_object(
    'action', jsonb_build_object(
      'id', v_action.id,
      'clientActionId', v_action.client_action_id,
      'day', v_action.day::text,
      'kind', v_action.kind,
      'title', v_action.title,
      'rationale', v_action.rationale,
      'effortMinutes', v_action.effort_minutes,
      'source', v_action.source,
      'status', v_action.status,
      'context', coalesce(v_action.context, '{}'::jsonb),
      'suggestedAt', v_action.suggested_at,
      'completedAt', v_action.completed_at,
      'updatedAt', v_action.updated_at
    ),
    'replayed', v_replayed,
    'reused', v_reused
  );
end;
$$;

create or replace function public.rinlo_add_action_event(
  p_operation_id text,
  p_action_id uuid,
  p_event_type text,
  p_reason_code text default null,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_action public.rinlo_actions%rowtype;
  v_existing public.rinlo_action_events%rowtype;
  v_inserted boolean := false;
  v_next_status text;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_operation_id is null or btrim(p_operation_id) = '' or length(p_operation_id) > 180 then
    raise exception 'invalid_operation_id' using errcode = '22023';
  end if;
  if p_action_id is null then
    raise exception 'invalid_action_id' using errcode = '22023';
  end if;
  if p_event_type is null or p_event_type not in ('shown','accepted','completed','replaced','dismissed','feedback') then
    raise exception 'invalid_action_event_type' using errcode = '22023';
  end if;
  if p_reason_code is not null and p_reason_code not in ('no_time','low_energy','inconvenient_now','dont_want','already_did_similar','other') then
    raise exception 'invalid_reason_code' using errcode = '22023';
  end if;

  select * into v_action
  from public.rinlo_actions
  where id = p_action_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  insert into public.rinlo_action_events(
    user_id, action_id, event_type, reason_code, payload, operation_id
  ) values (
    v_user_id, p_action_id, p_event_type, p_reason_code,
    coalesce(p_payload, '{}'::jsonb), p_operation_id
  )
  on conflict (user_id, operation_id) where operation_id is not null do nothing;
  v_inserted := found;

  if not v_inserted then
    select * into v_existing
    from public.rinlo_action_events
    where user_id = v_user_id and operation_id = p_operation_id;

    if not found
      or v_existing.action_id <> p_action_id
      or v_existing.event_type <> p_event_type
      or v_existing.reason_code is distinct from p_reason_code
      or coalesce(v_existing.payload, '{}'::jsonb) <> coalesce(p_payload, '{}'::jsonb) then
      raise exception 'action_event_operation_conflict' using errcode = '23505';
    end if;
  else
    v_next_status := case p_event_type
      when 'accepted' then 'accepted'
      when 'completed' then 'completed'
      when 'replaced' then 'replaced'
      when 'dismissed' then 'dismissed'
      else v_action.status
    end;

    update public.rinlo_actions
    set status = v_next_status,
        completed_at = case when p_event_type = 'completed' then now() else completed_at end,
        updated_at = now()
    where id = p_action_id and user_id = v_user_id
    returning * into v_action;
  end if;

  -- Replay returns the current action state, not a stale pre-event snapshot.
  if not v_inserted then
    select * into v_action
    from public.rinlo_actions
    where id = p_action_id and user_id = v_user_id;
  end if;

  return jsonb_build_object(
    'action', jsonb_build_object(
      'id', v_action.id,
      'clientActionId', v_action.client_action_id,
      'day', v_action.day::text,
      'kind', v_action.kind,
      'title', v_action.title,
      'rationale', v_action.rationale,
      'effortMinutes', v_action.effort_minutes,
      'source', v_action.source,
      'status', v_action.status,
      'context', coalesce(v_action.context, '{}'::jsonb),
      'suggestedAt', v_action.suggested_at,
      'completedAt', v_action.completed_at,
      'updatedAt', v_action.updated_at
    ),
    'replayed', not v_inserted,
    'operationId', p_operation_id
  );
end;
$$;

revoke all on function public.rinlo_import_action(text, date, text, text, text, integer, jsonb, timestamptz) from public, anon;
revoke all on function public.rinlo_add_action_event(text, uuid, text, text, jsonb) from public, anon;
grant execute on function public.rinlo_import_action(text, date, text, text, text, integer, jsonb, timestamptz) to authenticated;
grant execute on function public.rinlo_add_action_event(text, uuid, text, text, jsonb) to authenticated;

commit;
