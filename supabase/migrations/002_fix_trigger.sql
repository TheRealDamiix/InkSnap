-- ============================================================
-- InkSnap — Fix handle_new_user trigger
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- This fixes the 500 error on signup by making the trigger
-- robust against any error condition.
-- ============================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_role      public.user_role := 'client';
  v_username  text;
  v_name      text;
begin
  -- Safely cast role (default to 'client' on any error)
  begin
    if new.raw_user_meta_data->>'role' in ('artist', 'client') then
      v_role := (new.raw_user_meta_data->>'role')::public.user_role;
    end if;
  exception when others then
    v_role := 'client';
  end;

  -- Build username: use provided value or fall back to unique stub
  v_username := nullif(trim(coalesce(new.raw_user_meta_data->>'username', '')), '');
  if v_username is null then
    v_username := 'user_' || replace(substr(new.id::text, 1, 12), '-', '');
  end if;

  -- Build display name
  v_name := nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), '');
  if v_name is null then
    v_name := v_username;
  end if;

  -- Insert profile, ignore if already exists
  insert into public.profiles (auth_user_id, role, username, display_name)
  values (new.id, v_role, v_username, v_name)
  on conflict (auth_user_id) do nothing;

  return new;

exception when others then
  -- Never let this trigger fail the signup
  raise warning 'handle_new_user failed for uid=%: %', new.id, sqlerrm;
  return new;
end;
$$;
