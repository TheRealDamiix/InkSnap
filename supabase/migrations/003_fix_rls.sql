-- Migration 003: Fix RLS recursion, fix conversation INSERT, add message attachments
-- Run this entire script in Supabase SQL Editor

-- =========================================================
-- 1. Non-recursive helper: returns conversation IDs for the
--    current user WITHOUT triggering RLS on the same table
-- =========================================================
create or replace function public.get_my_conversation_ids()
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select conversation_id
  from public.conversation_participants
  where profile_id = public.my_profile_id()
$$;

-- =========================================================
-- 2. Fix conversation_participants SELECT
--    Old policy was self-referencing → infinite recursion
--    New policy: see your own row OR any row in a convo
--    you belong to (via the SECURITY DEFINER helper)
-- =========================================================
drop policy if exists "cp_select" on public.conversation_participants;

create policy "cp_select" on public.conversation_participants
  for select using (
    profile_id = public.my_profile_id()
    or conversation_id in (select public.get_my_conversation_ids())
  );

-- =========================================================
-- 3. Fix conversations SELECT (was also looping via cp_select)
-- =========================================================
drop policy if exists "conversations_select" on public.conversations;

create policy "conversations_select" on public.conversations
  for select using (
    id in (select public.get_my_conversation_ids())
  );

-- =========================================================
-- 4. Fix conversations INSERT
--    Allow pre-specified UUID so client avoids SELECT-after-INSERT
--    (PostgREST applies SELECT policy on RETURNING rows before
--     participants exist, which caused 403)
-- =========================================================
drop policy if exists "conversations_insert" on public.conversations;

create policy "conversations_insert" on public.conversations
  for insert with check (auth.uid() is not null);

-- =========================================================
-- 5. Fix messages SELECT (was recursing via cp_select)
-- =========================================================
drop policy if exists "messages_select" on public.messages;

create policy "messages_select" on public.messages
  for select using (
    conversation_id in (select public.get_my_conversation_ids())
  );

-- =========================================================
-- 6. Fix messages INSERT (same fix)
-- =========================================================
drop policy if exists "messages_insert" on public.messages;

create policy "messages_insert" on public.messages
  for insert with check (
    sender_id = public.my_profile_id()
    and conversation_id in (select public.get_my_conversation_ids())
  );

-- =========================================================
-- 7. Storage policies (DROP first — IF NOT EXISTS not supported)
-- =========================================================
drop policy if exists "portfolio_storage_update" on storage.objects;
create policy "portfolio_storage_update" on storage.objects
  for update using (
    bucket_id = 'portfolio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "portfolio_storage_delete" on storage.objects;
create policy "portfolio_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'portfolio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatar_storage_update" on storage.objects;
create policy "avatar_storage_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatar_storage_delete" on storage.objects;
create policy "avatar_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- =========================================================
-- 8. Add attachment columns to messages
-- =========================================================
alter table public.messages
  add column if not exists attachment_url  text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text;

-- =========================================================
-- 9. Create chat-attachments storage bucket (public, 5 MB limit)
--    Public so we can use getPublicUrl() — no expiring signed URLs
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-attachments', 'chat-attachments', true, 5242880)
on conflict (id) do update
  set public = true, file_size_limit = 5242880;

drop policy if exists "chat_attachments_insert" on storage.objects;
create policy "chat_attachments_insert" on storage.objects
  for insert with check (
    bucket_id = 'chat-attachments'
    and auth.uid() is not null
  );

drop policy if exists "chat_attachments_select" on storage.objects;
create policy "chat_attachments_select" on storage.objects
  for select using (bucket_id = 'chat-attachments');

drop policy if exists "chat_attachments_delete" on storage.objects;
create policy "chat_attachments_delete" on storage.objects
  for delete using (
    bucket_id = 'chat-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- =========================================================
-- 10. Email-or-username login helper
-- =========================================================
drop function if exists public.get_email_for_login(text);
create or replace function public.get_email_for_login(p_identifier text)
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select au.email
  from auth.users au
  join public.profiles p on p.auth_user_id = au.id
  where p.username ilike p_identifier
     or lower(au.email) = lower(p_identifier)
  limit 1;
$$;
