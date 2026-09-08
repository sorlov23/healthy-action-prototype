alter table profiles
  add column if not exists primary_goal text,
  add column if not exists secondary_goals text[] not null default '{}'::text[],
  add column if not exists calorie_tracking_enabled boolean not null default true;

alter table profiles
  drop constraint if exists profiles_primary_goal_check;
alter table profiles
  add constraint profiles_primary_goal_check check (
    primary_goal is null or primary_goal in ('weight_loss','nutrition','movement','sleep','energy','nicotine')
  );

create table if not exists daily_checkins (
  user_id uuid not null references app_users(id) on delete cascade,
  day date not null,
  wellbeing text not null check (wellbeing in ('poor','okay','good','great')),
  energy smallint check (energy is null or energy between 1 and 5),
  sleep_quality smallint check (sleep_quality is null or sleep_quality between 1 and 5),
  sleep_minutes integer check (sleep_minutes is null or sleep_minutes between 0 and 1440),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id, day)
);

create index if not exists daily_checkins_day_idx
  on daily_checkins(day);

create table if not exists rinlo_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('movement','nutrition','recovery','hydration','sleep','nicotine','general')),
  title text not null,
  rationale text not null,
  effort_minutes integer check (effort_minutes is null or effort_minutes between 1 and 240),
  source text not null default 'rules' check (source in ('rules','ai','manual')),
  status text not null default 'suggested' check (status in ('suggested','accepted','completed','replaced','dismissed')),
  context jsonb not null default '{}'::jsonb,
  suggested_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists rinlo_actions_user_day_idx
  on rinlo_actions(user_id, day, suggested_at desc);

create index if not exists rinlo_actions_user_status_idx
  on rinlo_actions(user_id, status, suggested_at desc);

create table if not exists rinlo_action_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  action_id uuid not null references rinlo_actions(id) on delete cascade,
  event_type text not null check (event_type in ('shown','accepted','completed','replaced','dismissed','feedback')),
  reason_code text check (
    reason_code is null or reason_code in ('no_time','low_energy','inconvenient_now','dont_want','already_did_similar','other')
  ),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists rinlo_action_events_action_idx
  on rinlo_action_events(action_id, created_at asc);

create index if not exists rinlo_action_events_user_idx
  on rinlo_action_events(user_id, created_at desc);
