-- ============================================================
-- Migration 015: Fix artist_studios RLS + join_studio RPC
-- ============================================================
-- Problem: artist_studios INSERT policy uses my_profile_id() which
-- can return NULL in some client contexts, causing a hard RLS violation.
-- Solution: SECURITY DEFINER RPC (same pattern as create_conversation).
-- Also adds missing UPDATE policy needed for set-primary.
-- ============================================================

-- 1. Missing UPDATE policy on artist_studios (needed for set-primary)
create policy "artist_studios_update" on public.artist_studios
  for update using (artist_id = public.my_profile_id());

-- 2. join_studio RPC — atomically affiliates the calling artist with a studio.
--    Runs as the function owner (SECURITY DEFINER) so it can bypass the
--    INSERT RLS policy that relies on my_profile_id() matching in client context.
create or replace function public.join_studio(
  p_studio_id  uuid,
  p_is_primary boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
begin
  -- Resolve caller's profile id from their JWT
  select id
    into v_profile_id
    from public.profiles
   where auth_user_id = auth.uid();

  if v_profile_id is null then
    raise exception 'not_authenticated';
  end if;

  -- Insert affiliation; silently no-op if already joined
  insert into public.artist_studios (artist_id, studio_id, is_primary)
  values (v_profile_id, p_studio_id, p_is_primary)
  on conflict (artist_id, studio_id) do nothing;
end;
$$;

grant execute on function public.join_studio(uuid, boolean) to authenticated;

-- ============================================================
-- End of migration 015
-- ============================================================
