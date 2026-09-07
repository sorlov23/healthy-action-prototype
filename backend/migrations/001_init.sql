create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

create table if not exists foods (
  id text primary key,
  name text not null,
  normalized_name text not null,
  kcal_100 numeric(8,2) not null check (kcal_100 >= 0),
  protein_100 numeric(8,2) not null default 0 check (protein_100 >= 0),
  fat_100 numeric(8,2),
  carbs_100 numeric(8,2),
  default_portion_g numeric(8,2) not null check (default_portion_g > 0),
  icon text,
  source text not null default 'healthy_action_seed',
  source_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists food_aliases (
  id bigserial primary key,
  food_id text not null references foods(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  created_at timestamptz not null default now(),
  unique(food_id, normalized_alias)
);

create index if not exists foods_normalized_name_trgm_idx
  on foods using gin (normalized_name gin_trgm_ops);
create index if not exists food_aliases_normalized_alias_trgm_idx
  on food_aliases using gin (normalized_alias gin_trgm_ops);
create index if not exists food_aliases_food_id_idx on food_aliases(food_id);

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  user_id uuid primary key references app_users(id) on delete cascade,
  birth_year integer,
  sex text check (sex in ('male','female','other')),
  height_cm numeric(6,2),
  target_weight_kg numeric(6,2),
  calorie_target integer,
  protein_target_g integer,
  step_target integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  eaten_at timestamptz not null default now(),
  source text not null default 'text' check (source in ('text','photo','voice','manual')),
  original_text text,
  total_kcal numeric(10,2) not null default 0,
  total_protein_g numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists food_logs_user_eaten_at_idx on food_logs(user_id, eaten_at desc);

create table if not exists food_log_items (
  id uuid primary key default gen_random_uuid(),
  food_log_id uuid not null references food_logs(id) on delete cascade,
  food_id text references foods(id),
  name text not null,
  grams numeric(8,2) not null check (grams > 0),
  kcal numeric(10,2) not null default 0,
  protein_g numeric(10,2) not null default 0,
  confidence numeric(4,3),
  created_at timestamptz not null default now()
);

create index if not exists food_log_items_log_id_idx on food_log_items(food_log_id);

create table if not exists weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  measured_at timestamptz not null default now(),
  weight_kg numeric(6,2) not null check (weight_kg > 0),
  created_at timestamptz not null default now()
);

create index if not exists weight_logs_user_measured_at_idx on weight_logs(user_id, measured_at desc);

create table if not exists daily_metrics (
  user_id uuid not null references app_users(id) on delete cascade,
  day date not null,
  water_ml integer not null default 0,
  steps integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key(user_id, day)
);
