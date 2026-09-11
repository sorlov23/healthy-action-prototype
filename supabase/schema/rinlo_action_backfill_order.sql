-- Harden action backfill when an existing Supabase identity already has a newer
-- active recommendation. Older local-first actions must be imported as history
-- instead of being collapsed into the current active action.

begin;

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
  v_active public.rinlo_actions%rowtype;
  v_replayed boolean := false;
  v_reused boolean := false;
  v_historical boolean := false;
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
    select * into v_active
    from public.rinlo_actions
    where user_id = v_user_id
      and day = p_day
      and status in ('suggested','accepted')
    order by suggested_at desc
    limit 1;

    if found and coalesce(p_suggested_at, now()) >= v_active.suggested_at then
      -- A current/newer action already owns the active slot (typically another
      -- device). Reuse it rather than creating a second active recommendation.
      v_action := v_active;
      v_reused := true;
    else
      -- When backfilling an older local-first action behind a newer active one,
      -- import it as inactive history. Its durable queued event will then move it
      -- to the exact historical state (completed/dismissed/replaced/etc.).
      v_historical := found;
      begin
        insert into public.rinlo_actions(
          user_id, day, kind, title, rationale, effort_minutes,
          source, context, suggested_at, client_action_id, status
        ) values (
          v_user_id, p_day, p_kind, btrim(p_title), btrim(p_rationale),
          p_effort_minutes, 'rules', coalesce(p_context, '{}'::jsonb),
          coalesce(p_suggested_at, now()), p_client_action_id,
          case when v_historical then 'replaced' else 'suggested' end
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
          and client_action_id = p_client_action_id
        limit 1;
        if found then
          v_replayed := true;
        else
          select * into v_action
          from public.rinlo_actions
          where user_id = v_user_id
            and day = p_day
            and status in ('suggested','accepted')
          order by suggested_at desc
          limit 1;
          if not found then raise; end if;
          v_reused := true;
        end if;
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
    'reused', v_reused,
    'historical', v_historical
  );
end;
$$;

revoke all on function public.rinlo_import_action(text, date, text, text, text, integer, jsonb, timestamptz) from public, anon;
grant execute on function public.rinlo_import_action(text, date, text, text, text, integer, jsonb, timestamptz) to authenticated;

commit;
