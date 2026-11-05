alter table public.rinlo_decision_corrections
  add column if not exists revoked_at timestamptz;

revoke all on table public.rinlo_decision_corrections from authenticated;
grant select, insert, update on table public.rinlo_decision_corrections to authenticated;

drop policy if exists "rinlo corrections update own" on public.rinlo_decision_corrections;
create policy "rinlo corrections update own"
  on public.rinlo_decision_corrections
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
