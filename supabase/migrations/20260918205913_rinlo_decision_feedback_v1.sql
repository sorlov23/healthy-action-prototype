create table public.rinlo_decision_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_decision_id text not null,
  feedback text not null check (feedback in ('helpful','not_helpful')),
  decision_source text check (decision_source is null or decision_source in ('text','photo','voice')),
  decision_stage text check (decision_stage is null or decision_stage in ('choosing','preparing','ready')),
  decision_state text check (
    decision_state is null or decision_state in (
      'fits_well','fits_with_adjustment','better_alternative','needs_clarification'
    )
  ),
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rinlo_decision_feedback_user_decision_unique
    unique (user_id, client_decision_id)
);

create index rinlo_decision_feedback_user_updated_idx
  on public.rinlo_decision_feedback (user_id, updated_at desc);

alter table public.rinlo_decision_feedback enable row level security;

create policy "rinlo feedback select own"
  on public.rinlo_decision_feedback
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "rinlo feedback insert own"
  on public.rinlo_decision_feedback
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "rinlo feedback update own"
  on public.rinlo_decision_feedback
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.rinlo_decision_feedback from anon, authenticated;
grant select, insert, update on table public.rinlo_decision_feedback to authenticated;
grant select, insert, update, delete on table public.rinlo_decision_feedback to service_role;
