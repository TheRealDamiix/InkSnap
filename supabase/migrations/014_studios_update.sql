-- ============================================================
-- Migration 014: Studios — owner management + booking link
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Add owner_id to studios (nullable — existing rows safe)
alter table public.studios
  add column if not exists owner_id uuid references public.profiles(id) on delete set null;

create index if not exists studios_owner_idx on public.studios(owner_id);

-- 2. RLS: studio owner can update/delete their own studio
create policy "studios_update" on public.studios
  for update using (owner_id = public.my_profile_id());

create policy "studios_delete" on public.studios
  for delete using (owner_id = public.my_profile_id());

-- 3. Add optional studio_id to bookings (appointment location)
alter table public.bookings
  add column if not exists studio_id uuid references public.studios(id) on delete set null;

create index if not exists bookings_studio_idx on public.bookings(studio_id);

-- 4. Add studio city index for discovery
create index if not exists studios_city_idx on public.studios(city);

-- ============================================================
-- End of migration 014
-- ============================================================
