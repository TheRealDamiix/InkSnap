-- Migration 004: Conversation helper functions that bypass RLS
-- These SECURITY DEFINER functions query conversation_participants directly,
-- avoiding the self-referencing policy problem entirely.

-- =========================================================
-- 1. Simplify cp_select to only allow reading YOUR OWN rows
--    (non-recursive, bulletproof)
-- =========================================================
drop policy if exists "cp_select" on public.conversation_participants;

create policy "cp_select" on public.conversation_participants
  for select using (profile_id = public.my_profile_id());

-- =========================================================
-- 2. get_my_conversations()
--    Returns full inbox: other participant + last message
-- =========================================================
drop function if exists public.get_my_conversations();

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
    p.id             as other_profile_id,
    p.display_name   as other_display_name,
    p.username       as other_username,
    p.avatar_url     as other_avatar_url,
    p.role::text     as other_role,
    m.body           as last_message_body,
    m.attachment_name as last_message_name,
    m.attachment_type as last_message_type,
    m.created_at     as last_message_at
  from public.conversation_participants cp
  -- other participant
  join public.conversation_participants cp2
    on  cp2.conversation_id = cp.conversation_id
    and cp2.profile_id != cp.profile_id
  join public.profiles p on p.id = cp2.profile_id
  -- latest message (lateral)
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

-- =========================================================
-- 3. find_conversation(other_profile_id)
--    Returns existing conversation_id between current user
--    and another profile, or NULL if none exists.
-- =========================================================
drop function if exists public.find_conversation(uuid);

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

-- =========================================================
-- 4. get_conversation_partner(conv_id)
--    Returns the OTHER participant's profile for a conversation.
-- =========================================================
drop function if exists public.get_conversation_partner(uuid);

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
