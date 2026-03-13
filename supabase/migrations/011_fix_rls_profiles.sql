-- ============================================================
-- 011_fix_rls_profiles.sql
--
-- Root cause of 403: profiles are keyed by auth_user_id, NOT id.
--   profiles.auth_user_id = auth.uid()   ← the auth link
--   profiles.id           = separate UUID ← what participant/message rows store
--
-- All policies in 010 compared profile_id / sender_id against
-- auth.uid() directly, which never matched the stored UUIDs.
--
-- Fix: add my_profile_id() helper that resolves auth.uid() → profiles.id
-- then rebuild all affected policies using that helper.
-- ============================================================

-- ── Helper: current user's profile UUID ──────────────────────
create or replace function public.my_profile_id()
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select id from public.profiles where auth_user_id = auth.uid()
$$;

grant execute on function public.my_profile_id() to anon, authenticated;

-- ── Drop broken policies ──────────────────────────────────────
drop policy if exists "participants_insert" on public.conversation_participants;
drop policy if exists "participants_update" on public.conversation_participants;
drop policy if exists "participants_delete" on public.conversation_participants;
drop policy if exists "conversations_select" on public.conversations;
drop policy if exists "messages_select"      on public.messages;
drop policy if exists "messages_insert"      on public.messages;

-- ── Recreate with correct profile lookup ─────────────────────

-- conversation_participants: write restricted to own row
create policy "participants_insert"
  on public.conversation_participants for insert
  with check (profile_id = public.my_profile_id());

create policy "participants_update"
  on public.conversation_participants for update
  using (profile_id = public.my_profile_id());

create policy "participants_delete"
  on public.conversation_participants for delete
  using (profile_id = public.my_profile_id());

-- conversations: visible if you are a participant
create policy "conversations_select"
  on public.conversations for select
  using (
    exists (
      select 1 from public.conversation_participants
       where conversation_id = conversations.id
         and profile_id      = public.my_profile_id()
    )
  );

-- messages: flat participant check using resolved profile ID
create policy "messages_select"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversation_participants
       where conversation_id = messages.conversation_id
         and profile_id      = public.my_profile_id()
    )
  );

create policy "messages_insert"
  on public.messages for insert
  with check (
    sender_id = public.my_profile_id()
    and exists (
      select 1 from public.conversation_participants
       where conversation_id = messages.conversation_id
         and profile_id      = public.my_profile_id()
    )
  );

-- ── Schema cache reload ───────────────────────────────────────
notify pgrst, 'reload schema';
