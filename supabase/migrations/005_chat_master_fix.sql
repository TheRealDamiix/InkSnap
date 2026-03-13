-- ============================================================
-- Migration 005: Chat System Master Fix
-- Safe to run even if migrations 003/004 were partially applied.
-- Run the entire script in Supabase SQL Editor.
-- ============================================================

-- ============================================================
-- STEP 1: Fix messages table schema
-- ============================================================

-- Allow body to be null (needed for file-only messages)
alter table public.messages
  alter column body drop not null;

-- Add attachment columns (idempotent)
alter table public.messages
  add column if not exists attachment_url  text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text;

-- ============================================================
-- STEP 2: Create chat-attachments storage bucket
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-attachments', 'chat-attachments', true, 5242880)
on conflict (id) do update
  set public = true, file_size_limit = 5242880;

-- ============================================================
-- STEP 3: Drop all existing conversation-related policies
-- ============================================================
drop policy if exists "conversations_select"   on public.conversations;
drop policy if exists "conversations_insert"   on public.conversations;
drop policy if exists "cp_select"              on public.conversation_participants;
drop policy if exists "cp_insert"              on public.conversation_participants;
drop policy if exists "cp_update"              on public.conversation_participants;
drop policy if exists "messages_select"        on public.messages;
drop policy if exists "messages_insert"        on public.messages;

-- ============================================================
-- STEP 4: Drop all existing helper functions
-- ============================================================
drop function if exists public.get_my_conversation_ids();
drop function if exists public.get_my_conversations();
drop function if exists public.find_conversation(uuid);
drop function if exists public.get_conversation_partner(uuid);

-- ============================================================
-- STEP 5: Create SECURITY DEFINER helper functions
--   These bypass RLS entirely, breaking any recursion risk.
-- ============================================================

-- 5a. get_my_conversation_ids()
--     Used by RLS policies on conversations + messages.
create function public.get_my_conversation_ids()
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

-- 5b. get_my_conversations()
--     Full inbox: partner profile + last message. Called from client via rpc().
create function public.get_my_conversations()
returns table (
  conversation_id    uuid,
  unread_count       int,
  other_profile_id   uuid,
  other_display_name text,
  other_username     text,
  other_avatar_url   text,
  other_role         text,
  last_message_body  text,
  last_message_name  text,
  last_message_type  text,
  last_message_at    timestamptz
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    cp.conversation_id,
    cp.unread_count,
    p.id               as other_profile_id,
    p.display_name     as other_display_name,
    p.username         as other_username,
    p.avatar_url       as other_avatar_url,
    p.role::text       as other_role,
    m.body             as last_message_body,
    m.attachment_name  as last_message_name,
    m.attachment_type  as last_message_type,
    m.created_at       as last_message_at
  from public.conversation_participants cp
  join public.conversation_participants cp2
    on  cp2.conversation_id = cp.conversation_id
    and cp2.profile_id != cp.profile_id
  join public.profiles p on p.id = cp2.profile_id
  left join lateral (
    select body, attachment_name, attachment_type, created_at
    from public.messages
    where conversation_id = cp.conversation_id
    order by created_at desc
    limit 1
  ) m on true
  where cp.profile_id = public.my_profile_id()
  order by coalesce(m.created_at, cp.created_at) desc
$$;

-- 5c. find_conversation(other_profile_id)
--     Returns existing conversation_id between current user and another profile.
create function public.find_conversation(other_profile_id uuid)
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select cp1.conversation_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2
    on  cp2.conversation_id = cp1.conversation_id
    and cp2.profile_id = other_profile_id
  where cp1.profile_id = public.my_profile_id()
  limit 1
$$;

-- 5d. get_conversation_partner(conv_id)
--     Returns the other participant's profile for a given conversation.
create function public.get_conversation_partner(conv_id uuid)
returns table (
  id           uuid,
  display_name text,
  username     text,
  avatar_url   text,
  role         text
)
language sql
security definer
stable
set search_path = ''
as $$
  select p.id, p.display_name, p.username, p.avatar_url, p.role::text
  from public.conversation_participants cp
  join public.profiles p on p.id = cp.profile_id
  where cp.conversation_id = conv_id
    and cp.profile_id != public.my_profile_id()
  limit 1
$$;

-- ============================================================
-- STEP 6: Recreate RLS policies
-- ============================================================

-- conversation_participants
create policy "cp_select" on public.conversation_participants
  for select using (profile_id = public.my_profile_id());

create policy "cp_insert" on public.conversation_participants
  for insert with check (auth.uid() is not null);

create policy "cp_update" on public.conversation_participants
  for update using (profile_id = public.my_profile_id());

-- conversations
create policy "conversations_select" on public.conversations
  for select using (id in (select public.get_my_conversation_ids()));

create policy "conversations_insert" on public.conversations
  for insert with check (auth.uid() is not null);

-- messages
create policy "messages_select" on public.messages
  for select using (conversation_id in (select public.get_my_conversation_ids()));

create policy "messages_insert" on public.messages
  for insert with check (
    sender_id = public.my_profile_id()
    and conversation_id in (select public.get_my_conversation_ids())
  );

-- ============================================================
-- STEP 7: chat-attachments storage policies
-- ============================================================
drop policy if exists "chat_attachments_insert" on storage.objects;
drop policy if exists "chat_attachments_select" on storage.objects;
drop policy if exists "chat_attachments_delete" on storage.objects;

create policy "chat_attachments_insert" on storage.objects
  for insert with check (
    bucket_id = 'chat-attachments' and auth.uid() is not null
  );

create policy "chat_attachments_select" on storage.objects
  for select using (bucket_id = 'chat-attachments');

create policy "chat_attachments_delete" on storage.objects
  for delete using (
    bucket_id = 'chat-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- STEP 8: Ensure realtime is enabled
-- ============================================================
do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.conversation_participants;
  exception when duplicate_object then null;
  end;
end $$;
