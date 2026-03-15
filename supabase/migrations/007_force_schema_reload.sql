-- Migration 007: Force PostgREST schema cache reload
-- Run in Supabase SQL Editor → should immediately fix the /rest/v1/messages 404

-- ── 1. Verify messages table exists ─────────────────────────────────────────
-- (If this returns an error, the table is missing entirely → run 005 first)
select count(*) from public.messages limit 1;

-- ── 2. DDL touch — forces PostgREST to detect a schema change ───────────────
--    We add a temp column then drop it. Non-destructive.
alter table public.messages
  add column if not exists _pgrst_touch boolean default null;

alter table public.messages
  drop column if exists _pgrst_touch;

-- ── 3. Re-grant (belt + suspenders) ─────────────────────────────────────────
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete
  on public.messages
  to anon, authenticated, service_role;

grant select, insert, update, delete
  on public.conversations
  to anon, authenticated, service_role;

grant select, insert, update, delete
  on public.conversation_participants
  to anon, authenticated, service_role;

grant select, insert, update, delete
  on public.profiles
  to anon, authenticated, service_role;

-- ── 4. Ensure body is nullable (in case migration 005 didn't apply cleanly) ──
alter table public.messages
  alter column body drop not null;

-- ── 5. Ensure attachment columns exist ──────────────────────────────────────
alter table public.messages
  add column if not exists attachment_url  text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text;

-- ── 6. Verify RLS policies exist ─────────────────────────────────────────────
-- Should return at least 2 rows (messages_select, messages_insert)
select polname, polcmd from pg_policies
where tablename = 'messages' and schemaname = 'public';

-- ── 7. Verify my_profile_id() exists ────────────────────────────────────────
-- Should return 1 row
select routine_name from information_schema.routines
where routine_schema = 'public' and routine_name = 'my_profile_id';

-- ── 8. Force PostgREST reload ────────────────────────────────────────────────
notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');
