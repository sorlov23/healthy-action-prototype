-- Fit74 recovery notes stay separate from scores and workout records.
-- A marked difficult day is not automatically counted as completed.
create table if not exists public.fit74_day_context (
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  reason text check (reason is null or reason in ('fatigue','schedule','food','health','other')),
  return_steps jsonb not null default '{}'::jsonb check (jsonb_typeof(return_steps) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, entry_date)
);
alter table public.fit74_day_context enable row level security;
revoke all on public.fit74_day_context from public, anon;
grant select, insert, update, delete on public.fit74_day_context to authenticated;
create policy fit74_day_context_select on public.fit74_day_context for select to authenticated
  using ((select auth.uid()) = user_id);
create policy fit74_day_context_insert on public.fit74_day_context for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy fit74_day_context_update on public.fit74_day_context for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy fit74_day_context_delete on public.fit74_day_context for delete to authenticated
  using ((select auth.uid()) = user_id);
comment on table public.fit74_day_context is 'User-owned reflection and return-step ticks. These do not award score or streak days.';
