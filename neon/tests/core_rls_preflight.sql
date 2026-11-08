-- Read-only Neon Rinlo schema/RLS preflight.
-- Run against the Neon migration branch first; expected all booleans = true.
WITH core(name) AS (
  values ('rinlo_decision_profiles'::text),
         ('rinlo_decisions'),
         ('rinlo_decision_corrections'),
         ('rinlo_decision_feedback')
), checks AS (
  select
    c.name,
    cls.oid is not null as table_exists,
    coalesce(cls.relrowsecurity, false) as rls_enabled,
    not has_table_privilege('anonymous', format('public.%I', c.name), 'SELECT') as anonymous_select_denied,
    has_table_privilege('authenticated', format('public.%I', c.name), 'SELECT') as authenticated_select_granted,
    exists (
      select 1 from pg_policies p
      where p.schemaname = 'public' and p.tablename = c.name
        and 'authenticated' = any (p.roles)
    ) as authenticated_policy_present
  from core c
  left join pg_class cls on cls.relname=c.name and cls.relnamespace='public'::regnamespace
)
select * from checks order by name;

-- FK should reference Neon Auth users, not auth.users from Supabase.
select conrelid::regclass::text as table_name,
       confrelid::regclass::text as referenced_table,
       contype
from pg_constraint
where connamespace='public'::regnamespace
  and contype='f'
  and conrelid in (
    'public.rinlo_decision_profiles'::regclass,
    'public.rinlo_decisions'::regclass,
    'public.rinlo_decision_corrections'::regclass,
    'public.rinlo_decision_feedback'::regclass
  )
order by table_name;
