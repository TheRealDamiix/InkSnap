-- ============================================================
-- InkSnap — Migration 003: RPC functions + RLS fixes
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ============================================================
-- 1. RPC: get_email_for_login (username → email lookup)
--    Used by the login page to allow signing in with username
-- ============================================================

create or replace function get_email_for_login(p_username text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  select au.email into v_email
  from public.profiles p
  join auth.users au on au.id = p.auth_user_id
  where lower(p.username) = lower(p_username)
  limit 1;

  return v_email;
end;
$$;

-- ============================================================
-- 2. Fix conversation_participants RLS
--    The original policy was self-referencing (cp_select
--    queries conversation_participants inside its own
--    select policy), which causes infinite recursion / 500.
--    Replace with a direct profile_id check.
-- ============================================================

-- Drop the old self-referencing policy
drop policy if exists "cp_select" on conversation_participants;

-- New simple policy: you can see rows where you're a participant
create policy "cp_select" on conversation_participants
  for select using (profile_id = my_profile_id());

-- Also fix conversations select which has the same self-ref issue
drop policy if exists "conversations_select" on conversations;

create policy "conversations_select" on conversations
  for select using (
    id in (
      select conversation_id
      from public.conversation_participants
      where profile_id = my_profile_id()
    )
  );

-- Also fix messages select
drop policy if exists "messages_select" on messages;

create policy "messages_select" on messages
  for select using (
    conversation_id in (
      select conversation_id
      from public.conversation_participants
      where profile_id = my_profile_id()
    )
  );

-- Also fix messages insert
drop policy if exists "messages_insert" on messages;

create policy "messages_insert" on messages
  for insert with check (
    sender_id = my_profile_id()
    and conversation_id in (
      select conversation_id
      from public.conversation_participants
      where profile_id = my_profile_id()
    )
  );

-- ============================================================
-- 3. Storage: ensure UPDATE policies exist
--    Supabase storage may need UPDATE for overwrites / upserts
-- ============================================================

-- Portfolio
create policy if not exists "portfolio_storage_update" on storage.objects
  for update using (bucket_id = 'portfolio' and auth.uid() is not null);

-- Avatars
create policy if not exists "avatars_storage_update" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid() is not null);

-- ============================================================
-- 4. Grant execute on the RPC function to anon + authenticated
-- ============================================================

grant execute on function get_email_for_login(text) to anon;
grant execute on function get_email_for_login(text) to authenticated;
