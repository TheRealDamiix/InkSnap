-- ============================================================
-- 008_nuclear_reload.sql
-- Nuclear schema reload: dummy DDL + full re-grant + notify
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Create a dummy table — forces a physical DDL event that
--    PostgREST detects even when NOTIFY is silently dropped
create table if not exists public.force_refresh_dummy (id int);

-- 2. Re-grant everything explicitly
grant usage on schema public to anon, authenticated;
grant all on all tables    in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant all on all functions in schema public to anon, authenticated;

-- 3. Drop the dummy (second DDL event — belt-and-suspenders)
drop table if exists public.force_refresh_dummy;

-- 4. Force PostgREST cache reload
notify pgrst, 'reload schema';
