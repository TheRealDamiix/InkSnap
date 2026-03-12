-- ============================================================
-- InkSnap — Username login RPC
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Allows the login page to resolve a username → email so users
-- can sign in with either their email address or their username.
-- Security: username is already public, so returning the associated
-- email for auth purposes is acceptable. The function is accessible
-- to the anon role (unauthenticated callers) intentionally.

create or replace function public.get_email_for_login(p_username text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email
  from auth.users u
  join public.profiles p on p.auth_user_id = u.id
  where lower(p.username) = lower(p_username)
  limit 1
$$;

-- Grant execute to anon so unauthenticated login requests can call it
grant execute on function public.get_email_for_login(text) to anon;
