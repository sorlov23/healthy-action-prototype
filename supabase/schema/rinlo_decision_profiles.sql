-- Rinlo Decisions profile v1
-- Product-reset profile context used only for decision personalization.

create table public.rinlo_decision_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  goal text
    check (goal is null or goal in ('lose','maintain','aware')),
  current_weight_kg numeric(6,2)
    check (current_weight_kg is null or current_weight_kg > 0),
  target_weight_kg numeric(6,2)
    check (target_weight_kg is null or target_weight_kg > 0),
  sex_for_calorie text
    check (sex_for_calorie is null or sex_for_calorie in ('male','female')),
  age_years smallint
    check (age_years is null or age_years between 18 and 100),
  height_cm numeric(5,1)
    check (height_cm is null or height_cm between 120 and 230),
  activity_level text
    check (
      activity_level is null
      or activity_level in ('sedentary','light','moderate','high','very_high')
    ),
  priorities text[] not null default '{}'::text[]
    check (priorities <@ array['satiety','calories','familiar','simplicity']::text[]),
  staples text[] not null default '{}'::text[]
    check (
      staples <@ array[
        'salt','pepper','vegetable_oil','butter','garlic','onion',
        'eggs','rice','buckwheat','pasta','flour','milk','cheese',
        'sour_cream','soy_sauce'
      ]::text[]
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rinlo_decision_profiles enable row level security;

create policy "Users manage own Rinlo decision profile"
  on public.rinlo_decision_profiles
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.rinlo_decision_profiles from anon;
grant select, insert, update, delete on table public.rinlo_decision_profiles to authenticated;
