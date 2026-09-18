-- Rinlo Decisions v1
-- Separate product-reset entity. Old rinlo_actions remain untouched.

create table public.rinlo_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_decision_id text not null,
  source text not null default 'text'
    check (source in ('text','photo','voice')),
  question text not null,
  decision_state text not null
    check (decision_state in ('fits_well','fits_with_adjustment','better_alternative','needs_clarification')),
  verdict_title text not null,
  explanation text not null,
  context_label text,
  fit_text text,
  original_option jsonb not null default '{}'::jsonb,
  alternative_option jsonb,
  selected_option jsonb not null default '{}'::jsonb,
  selected_kind text not null
    check (selected_kind in ('original','alternative')),
  calorie_min integer
    check (calorie_min is null or calorie_min >= 0),
  calorie_max integer
    check (calorie_max is null or calorie_max >= 0),
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rinlo_decisions_calorie_range_check
    check (calorie_min is null or calorie_max is null or calorie_max >= calorie_min),
  constraint rinlo_decisions_user_client_unique
    unique (user_id, client_decision_id)
);

create index rinlo_decisions_user_created_idx
  on public.rinlo_decisions (user_id, created_at desc);

alter table public.rinlo_decisions enable row level security;

create policy "Users manage own Rinlo decisions"
  on public.rinlo_decisions
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
