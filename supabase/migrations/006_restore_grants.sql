-- Migration 006: Restore table grants + force schema cache reload
-- Run this in Supabase SQL Editor if you see 404 on /rest/v1/messages
-- or 404 on any RPC function after running migration 005.

-- ── 1. Ensure PostgREST can see the public schema ──────────────────────────
grant usage on schema public to anon, authenticated, service_role;

-- ── 2. Re-grant all messaging tables ───────────────────────────────────────
grant select, insert, update, delete
  on public.conversations
  to anon, authenticated;

grant select, insert, update, delete
  on public.conversation_participants
  to anon, authenticated;

grant select, insert, update, delete
  on public.messages
  to anon, authenticated;

-- ── 3. Re-grant core tables (in case any were affected) ────────────────────
grant select, insert, update, delete
  on public.profiles
  to anon, authenticated;

grant select, insert, update, delete
  on public.bookings
  to anon, authenticated;

grant select, insert, update, delete
  on public.booking_images
  to anon, authenticated;

-- ── 4. Grant execute on all SECURITY DEFINER helper functions ──────────────
grant execute on function public.my_profile_id()              to anon, authenticated;
grant execute on function public.get_my_conversation_ids()    to anon, authenticated;
grant execute on function public.get_my_conversations()       to anon, authenticated;
grant execute on function public.find_conversation(uuid)      to anon, authenticated;
grant execute on function public.get_conversation_partner(uuid) to anon, authenticated;

-- ── 5. Force PostgREST schema cache reload ─────────────────────────────────
notify pgrst, 'reload schema';
