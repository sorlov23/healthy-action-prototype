-- Durable Rinlo evening review / learning signal.
-- One row per authenticated user and local calendar day.

begin;

create table if not exists public.daily_evening_reviews (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  plan_fit text not null check (plan_fit in ('easy','right','too_much')),
  action_useful text not null check (action_useful in ('yes','no','skipped')),
  main_action_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id, day),
  constraint daily_evening_reviews_action_owner_fk
    foreign key (main_action_id, user_id)
    references public.rinlo_actions(id, user_id)
    on delete set null (main_action_id)
);

create index if not exists daily_evening_reviews_action_idx
  on public.daily_evening_reviews(main_action_id, user_id)
  where main_action_id is not null;

alter table public.daily_evening_reviews enable row level security;

drop policy if exists "Users manage own evening reviews" on public.daily_evening_reviews;
create policy "Users manage own evening reviews"
  on public.daily_evening_reviews for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.daily_evening_reviews from anon, authenticated;
grant select, insert, update, delete on table public.daily_evening_reviews to authenticated;

commit;
