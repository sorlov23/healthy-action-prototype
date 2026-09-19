create table if not exists public.rinlo_decision_corrections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_correction_id text not null,
  client_decision_id text not null,
  correction_type text not null check (
    correction_type = any (array['dish'::text, 'portion'::text, 'ingredients'::text, 'choice'::text])
  ),
  correction_value text not null check (char_length(correction_value) between 1 and 240),
  dish_name text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, client_correction_id)
);

create index if not exists rinlo_decision_corrections_user_created_idx
  on public.rinlo_decision_corrections (user_id, created_at desc);

alter table public.rinlo_decision_corrections enable row level security;

revoke all on table public.rinlo_decision_corrections from anon, authenticated;
grant select, insert on table public.rinlo_decision_corrections to authenticated;
grant select, insert, update, delete on table public.rinlo_decision_corrections to service_role;

drop policy if exists "rinlo corrections select own" on public.rinlo_decision_corrections;
create policy "rinlo corrections select own"
  on public.rinlo_decision_corrections
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "rinlo corrections insert own" on public.rinlo_decision_corrections;
create policy "rinlo corrections insert own"
  on public.rinlo_decision_corrections
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
