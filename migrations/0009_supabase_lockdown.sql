-- Supabase publishes the public schema through its HTTP API. The app talks to
-- Postgres as the table owner (that role bypasses row level security). The
-- anon and authenticated API roles must not be able to read accounts, lots,
-- bids, or messages if the anon key ever leaks. On a database without those
-- roles (preview, Neon) this is a no-op.

do $$
declare
  r record;
  role_name text;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format('alter table public.%I enable row level security', r.relname);
  end loop;

  foreach role_name in array array['anon', 'authenticated']
  loop
    if exists (select 1 from pg_roles where rolname = role_name) then
      execute format('revoke all on all tables in schema public from %I', role_name);
      execute format('revoke all on all sequences in schema public from %I', role_name);
    end if;
  end loop;
end $$;
