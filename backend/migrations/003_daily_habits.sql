alter table daily_metrics
  add column if not exists habit_flags jsonb not null default '{}'::jsonb;

create index if not exists daily_metrics_day_idx on daily_metrics(day);
