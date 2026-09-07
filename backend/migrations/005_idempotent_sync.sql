alter table food_logs
  add column if not exists client_event_id text;

create unique index if not exists food_logs_user_client_event_id_uidx
  on food_logs(user_id, client_event_id)
  where client_event_id is not null;

alter table weight_logs
  add column if not exists client_event_id text;

create unique index if not exists weight_logs_user_client_event_id_uidx
  on weight_logs(user_id, client_event_id)
  where client_event_id is not null;

create table if not exists daily_metric_operations (
  user_id uuid not null references app_users(id) on delete cascade,
  operation_id text not null,
  day date not null,
  water_ml_delta integer not null default 0,
  steps_delta integer not null default 0,
  created_at timestamptz not null default now(),
  primary key(user_id, operation_id)
);

create index if not exists daily_metric_operations_day_idx
  on daily_metric_operations(user_id, day, created_at desc);
