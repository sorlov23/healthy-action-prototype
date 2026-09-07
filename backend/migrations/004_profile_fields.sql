alter table profiles
  add column if not exists start_weight_kg numeric(6,2),
  add column if not exists age_years integer,
  add column if not exists activity text,
  add column if not exists focuses text[] not null default '{}'::text[];

alter table profiles
  drop constraint if exists profiles_age_years_check;
alter table profiles
  add constraint profiles_age_years_check check (age_years is null or age_years between 14 and 100);

alter table profiles
  drop constraint if exists profiles_activity_check;
alter table profiles
  add constraint profiles_activity_check check (activity is null or activity in ('low','medium','high'));

alter table profiles
  drop constraint if exists profiles_start_weight_kg_check;
alter table profiles
  add constraint profiles_start_weight_kg_check check (start_weight_kg is null or start_weight_kg between 30 and 300);
