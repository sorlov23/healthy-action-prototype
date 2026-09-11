create table if not exists daily_evening_reviews (
  user_id uuid not null references app_users(id) on delete cascade,
  day date not null,
  plan_fit text not null check (plan_fit in ('easy','right','too_much')),
  action_useful text not null check (action_useful in ('yes','no','skipped')),
  main_action_id uuid references rinlo_actions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id, day)
);

create index if not exists daily_evening_reviews_action_idx
  on daily_evening_reviews(main_action_id)
  where main_action_id is not null;
