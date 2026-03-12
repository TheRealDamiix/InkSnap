-- ============================================================
-- InkSnap — Fix storage RLS + conversation_participants 500
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ============================================================
-- 1. STORAGE BUCKETS — ensure they exist
-- ============================================================

insert into storage.buckets (id, name, public) values
  ('portfolio',    'portfolio',    true),
  ('avatars',      'avatars',      true),
  ('booking-refs', 'booking-refs', false)
on conflict (id) do nothing;

-- ============================================================
-- 2. STORAGE RLS — drop any stale policies and recreate
-- ============================================================

-- Portfolio
drop policy if exists "portfolio_storage_select" on storage.objects;
drop policy if exists "portfolio_storage_insert" on storage.objects;
drop policy if exists "portfolio_storage_update" on storage.objects;
drop policy if exists "portfolio_storage_delete" on storage.objects;

create policy "portfolio_storage_select" on storage.objects
  for select using (bucket_id = 'portfolio');

create policy "portfolio_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'portfolio'
    and auth.uid() is not null
  );

create policy "portfolio_storage_update" on storage.objects
  for update using (
    bucket_id = 'portfolio'
    and auth.uid() is not null
  );

create policy "portfolio_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'portfolio'
    and auth.uid() is not null
  );

-- Avatars
drop policy if exists "avatars_storage_select" on storage.objects;
drop policy if exists "avatars_storage_insert" on storage.objects;
drop policy if exists "avatars_storage_update" on storage.objects;
drop policy if exists "avatars_storage_delete" on storage.objects;

create policy "avatars_storage_select" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
  );

create policy "avatars_storage_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid() is not null
  );

create policy "avatars_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid() is not null
  );

-- Booking refs
drop policy if exists "booking_refs_storage_select" on storage.objects;
drop policy if exists "booking_refs_storage_insert" on storage.objects;

create policy "booking_refs_storage_select" on storage.objects
  for select using (
    bucket_id = 'booking-refs'
    and auth.uid() is not null
  );

create policy "booking_refs_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'booking-refs'
    and auth.uid() is not null
  );

-- ============================================================
-- 3. FIX conversation_participants 500
--    The old cp_select policy self-references its own table,
--    causing infinite recursion. Replace with a security definer
--    helper that bypasses RLS internally.
-- ============================================================

create or replace function public.i_am_participant(p_conversation_id uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = p_conversation_id
      and profile_id = (
        select id from public.profiles
        where auth_user_id = auth.uid()
      )
  )
$$;

drop policy if exists "cp_select" on conversation_participants;

-- Allow users to see all participant rows in conversations they belong to
-- (uses the security definer fn to avoid recursive RLS lookup)
create policy "cp_select" on conversation_participants
  for select using (public.i_am_participant(conversation_id));
