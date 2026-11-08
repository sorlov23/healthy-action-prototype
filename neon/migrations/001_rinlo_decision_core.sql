-- Rinlo 2.0 core data schema for Neon PostgreSQL 17 / Managed Better Auth.
-- Candidate only: test on a Neon migration branch before promotion.
--
-- IMPORTANT:
--   This creates EMPTY tables. It does not transfer Supabase users, credentials or decisions.
--   Existing Supabase user_id values must NOT be treated as Neon Auth identities.
--   Import requires a verified old-user -> new-user mapping and user consent.
--
-- Neon Managed Better Auth supplies neon_auth."user"(id uuid).
-- Neon Data API supplies auth.uid() with the verified caller UUID.
-- All user-owned data remains protected by RLS.

begin;

create table public.rinlo_decision_profiles (
  user_id uuid primary key references neon_auth."user"(id) on delete cascade,
  goal text check (goal is null or goal in ('lose','maintain','aware')),
  current_weight_kg numeric(6,2) check (current_weight_kg is null or current_weight_kg > 0),
  target_weight_kg numeric(6,2) check (target_weight_kg is null or target_weight_kg > 0),
  sex_for_calorie text check (sex_for_calorie is null or sex_for_calorie in ('male','female')),
  age_years smallint check (age_years is null or age_years between 18 and 100),
  height_cm numeric(5,1) check (height_cm is null or height_cm between 120 and 230),
  activity_level text check (
    activity_level is null or activity_level in ('sedentary','light','moderate','high','very_high')
  ),
  priorities text[] not null default '{}'::text[]
    check (priorities <@ array['satiety','calories','familiar','simplicity']::text[]),
  staples text[] not null default '{}'::text[]
    check (staples <@ array[
      'salt','pepper','vegetable_oil','butter','garlic','onion',
      'eggs','rice','buckwheat','pasta','flour','milk','cheese','sour_cream','soy_sauce'
    ]::text[]),
  behavior_memory_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rinlo_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references neon_auth."user"(id) on delete cascade,
  client_decision_id text not null,
  source text not null default 'text'
    check (source in ('text','photo','voice','cook')),
  question text not null,
  decision_state text not null check (
    decision_state in ('fits_well','fits_with_adjustment','better_alternative','needs_clarification')
  ),
  verdict_title text not null,
  explanation text not null,
  context_label text,
  fit_text text,
  original_option jsonb not null default '{}'::jsonb,
  alternative_option jsonb,
  selected_option jsonb not null default '{}'::jsonb,
  selected_kind text not null check (selected_kind in ('original','alternative')),
  calorie_min integer check (calorie_min is null or calorie_min >= 0),
  calorie_max integer check (calorie_max is null or calorie_max >= 0),
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rinlo_decisions_calorie_range_check check (
    calorie_min is null or calorie_max is null or calorie_max >= calorie_min
  ),
  constraint rinlo_decisions_user_client_unique unique (user_id, client_decision_id)
);
create index rinlo_decisions_user_created_idx
  on public.rinlo_decisions (user_id, created_at desc);

create table public.rinlo_decision_corrections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references neon_auth."user"(id) on delete cascade,
  client_correction_id text not null,
  client_decision_id text not null,
  correction_type text not null check (correction_type in ('dish','portion','ingredients','choice')),
  correction_value text not null check (char_length(correction_value) between 1 and 240),
  dish_name text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint rinlo_decision_corrections_user_client_unique unique(user_id, client_correction_id)
);
create index rinlo_decision_corrections_user_created_idx
  on public.rinlo_decision_corrections (user_id, created_at desc);

create table public.rinlo_decision_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references neon_auth."user"(id) on delete cascade,
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
  constraint rinlo_decision_feedback_user_decision_unique unique(user_id, client_decision_id)
);
create index rinlo_decision_feedback_user_updated_idx
  on public.rinlo_decision_feedback(user_id, updated_at desc);

-- No blanket grants to public or unauthenticated clients.
revoke all on table
  public.rinlo_decision_profiles,
  public.rinlo_decisions,
  public.rinlo_decision_corrections,
  public.rinlo_decision_feedback
from public, anonymous, authenticated;

grant usage on schema public to authenticated;
grant select, insert, update, delete
  on public.rinlo_decision_profiles, public.rinlo_decisions
  to authenticated;
grant select, insert, update
  on public.rinlo_decision_corrections, public.rinlo_decision_feedback
  to authenticated;

alter table public.rinlo_decision_profiles enable row level security;
alter table public.rinlo_decisions enable row level security;
alter table public.rinlo_decision_corrections enable row level security;
alter table public.rinlo_decision_feedback enable row level security;

create policy rinlo_profile_owned
  on public.rinlo_decision_profiles for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy rinlo_decision_owned
  on public.rinlo_decisions for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy rinlo_correction_select
  on public.rinlo_decision_corrections for select to authenticated
  using ((select auth.uid()) = user_id);
create policy rinlo_correction_insert
  on public.rinlo_decision_corrections for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy rinlo_correction_update
  on public.rinlo_decision_corrections for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy rinlo_feedback_select
  on public.rinlo_decision_feedback for select to authenticated
  using ((select auth.uid()) = user_id);
create policy rinlo_feedback_insert
  on public.rinlo_decision_feedback for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy rinlo_feedback_update
  on public.rinlo_decision_feedback for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

commit;
