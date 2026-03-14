-- ============================================================
-- 013_fix_bookings_rls.sql
-- Root cause: bookings INSERT returning 403 (Forbidden).
-- Rebuild bookings + booking_images RLS policies from scratch,
-- ensuring my_profile_id() is current and policies are clean.
-- ============================================================

-- ── 1. Ensure my_profile_id() helper is current ─────────────
create or replace function public.my_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.profiles where auth_user_id = auth.uid()
$$;

grant execute on function public.my_profile_id() to anon, authenticated;

-- ── 2. Drop all existing bookings policies ───────────────────
drop policy if exists "bookings_select"  on public.bookings;
drop policy if exists "bookings_insert"  on public.bookings;
drop policy if exists "bookings_update"  on public.bookings;
drop policy if exists "bookings_delete"  on public.bookings;

-- ── 3. Recreate bookings policies using my_profile_id() ─────
--   Artists and clients can read their own bookings
create policy "bookings_select"
  on public.bookings for select
  using (
    artist_id = public.my_profile_id()
    or client_id = public.my_profile_id()
  );

--   Only clients can create bookings, and only as themselves
create policy "bookings_insert"
  on public.bookings for insert
  with check (client_id = public.my_profile_id());

--   Artists can confirm/decline/complete; clients can also update (e.g. cancel)
create policy "bookings_update"
  on public.bookings for update
  using (
    artist_id = public.my_profile_id()
    or client_id = public.my_profile_id()
  );

-- ── 4. Drop all existing booking_images policies ─────────────
drop policy if exists "booking_images_select" on public.booking_images;
drop policy if exists "booking_images_insert" on public.booking_images;
drop policy if exists "booking_images_delete" on public.booking_images;

-- ── 5. Recreate booking_images policies ─────────────────────
create policy "booking_images_select"
  on public.booking_images for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (
          b.artist_id = public.my_profile_id()
          or b.client_id = public.my_profile_id()
        )
    )
  );

--   Only the booking's client can upload reference images
create policy "booking_images_insert"
  on public.booking_images for insert
  with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.client_id = public.my_profile_id()
    )
  );

-- ── 6. Re-grant table access ─────────────────────────────────
grant select, insert, update, delete on public.bookings        to authenticated;
grant select, insert, update, delete on public.booking_images  to authenticated;

-- ── 7. Reload PostgREST schema cache ─────────────────────────
notify pgrst, 'reload schema';
