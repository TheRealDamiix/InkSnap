-- ============================================================
-- 012_create_conversation_rpc.sql
--
-- ROOT CAUSE: The participants_insert RLS policy (010/011) only
-- allows a user to insert their OWN row (profile_id = my_profile_id()).
-- Conversation creation requires inserting TWO rows (self + partner)
-- in one statement — the partner's row fails the WITH CHECK and
-- PostgreSQL rolls back the entire batch, leaving the conversation
-- with ZERO participants. Any subsequent messages INSERT then hits
-- 42501 because the participant-existence check finds nobody.
--
-- FIX: A SECURITY DEFINER function that:
--   1. Resolves the caller's profile UUID via my_profile_id()
--   2. Checks if a 1-1 conversation already exists (idempotent)
--   3. Creates the conversation + both participant rows atomically
--   4. Returns the conversation UUID
--
-- SECURITY DEFINER runs as the function owner (postgres / service
-- role), bypassing the INSERT RLS that would block the partner row.
-- The function itself enforces that only authenticated, valid users
-- can create conversations.
--
-- Run this in Supabase SQL Editor AFTER 011_fix_rls_profiles.sql.
-- ============================================================

create or replace function public.create_conversation(p_other_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_my_id    uuid := public.my_profile_id();
  v_conv_id  uuid;
  v_existing uuid;
begin
  -- Must be authenticated
  if v_my_id is null then
    raise exception 'not_authenticated' using hint = 'User has no profile row';
  end if;

  -- Cannot message yourself
  if v_my_id = p_other_profile_id then
    raise exception 'invalid_target' using hint = 'Cannot create a conversation with yourself';
  end if;

  -- Look for an existing 1-1 conversation between these two profiles
  select cp1.conversation_id
    into v_existing
    from public.conversation_participants cp1
    join public.conversation_participants cp2
      on  cp2.conversation_id = cp1.conversation_id
      and cp2.profile_id      = p_other_profile_id
   where cp1.profile_id = v_my_id
   limit 1;

  if v_existing is not null then
    -- Conversation already exists — return it (idempotent)
    return v_existing;
  end if;

  -- Create a new conversation row
  insert into public.conversations default values
  returning id into v_conv_id;

  -- Insert both participant rows.
  -- SECURITY DEFINER bypasses the participants_insert RLS policy,
  -- which intentionally only allows each user to insert their own row.
  insert into public.conversation_participants (conversation_id, profile_id)
  values
    (v_conv_id, v_my_id),
    (v_conv_id, p_other_profile_id);

  return v_conv_id;
end;
$$;

-- Grant to authenticated users only (anon users cannot create conversations)
grant execute on function public.create_conversation(uuid) to authenticated;

notify pgrst, 'reload schema';
