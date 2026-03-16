-- ============================================================
-- Migration 016: Social/Event Layer
-- Studios as pages, Conventions as events, unified For You feed
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Studio verification flag ─────────────────────────────
alter table public.studios
  add column if not exists is_verified boolean not null default false;

-- ── 2. Conventions table ─────────────────────────────────────
create type public.convention_artist_status as enum ('pending', 'confirmed');

create table public.conventions (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  organizer_id  uuid not null references public.profiles(id) on delete cascade,
  studio_id     uuid references public.studios(id) on delete set null,
  city          text not null,
  venue         text,
  start_date    date not null,
  end_date      date not null,
  cover_url     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index conventions_organizer_idx on public.conventions(organizer_id);
create index conventions_city_idx      on public.conventions(city);
create index conventions_dates_idx     on public.conventions(start_date, end_date);

create trigger conventions_updated_at before update on public.conventions
  for each row execute procedure public.handle_updated_at();

-- ── 3. Artist ↔ Convention attendance ────────────────────────
create table public.artist_conventions (
  id              uuid primary key default gen_random_uuid(),
  artist_id       uuid not null references public.profiles(id) on delete cascade,
  convention_id   uuid not null references public.conventions(id) on delete cascade,
  status          public.convention_artist_status not null default 'pending',
  created_at      timestamptz not null default now(),
  unique(artist_id, convention_id)
);

create index artist_conventions_artist_idx     on public.artist_conventions(artist_id);
create index artist_conventions_convention_idx on public.artist_conventions(convention_id);

-- ── 4. Studio follows ────────────────────────────────────────
create table public.studio_follows (
  id          uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  studio_id   uuid not null references public.studios(id)  on delete cascade,
  created_at  timestamptz not null default now(),
  unique(follower_id, studio_id)
);

create index studio_follows_follower_idx on public.studio_follows(follower_id);
create index studio_follows_studio_idx   on public.studio_follows(studio_id);

-- ── 5. Convention follows ────────────────────────────────────
create table public.convention_follows (
  id              uuid primary key default gen_random_uuid(),
  follower_id     uuid not null references public.profiles(id)    on delete cascade,
  convention_id   uuid not null references public.conventions(id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique(follower_id, convention_id)
);

create index convention_follows_follower_idx    on public.convention_follows(follower_id);
create index convention_follows_convention_idx  on public.convention_follows(convention_id);

-- ── 6. Extend promotions table ───────────────────────────────
-- Make artist_id nullable (studios and conventions post without an artist)
alter table public.promotions
  alter column artist_id drop not null;

-- Add studio and convention author columns
alter table public.promotions
  add column if not exists studio_id     uuid references public.studios(id)     on delete cascade,
  add column if not exists convention_id uuid references public.conventions(id) on delete cascade;

create index if not exists promotions_studio_idx     on public.promotions(studio_id);
create index if not exists promotions_convention_idx on public.promotions(convention_id);

-- Enforce exactly one author source per promotion
alter table public.promotions
  add constraint promotions_single_author check (
    (artist_id is not null)::int
    + (studio_id is not null)::int
    + (convention_id is not null)::int = 1
  );

-- Add studio_post promotion type
alter type public.promotion_type add value if not exists 'studio_post';

-- ── 7. RLS ───────────────────────────────────────────────────
alter table public.conventions         enable row level security;
alter table public.artist_conventions  enable row level security;
alter table public.studio_follows      enable row level security;
alter table public.convention_follows  enable row level security;

-- conventions
create policy "conventions_select" on public.conventions
  for select using (true);
create policy "conventions_insert" on public.conventions
  for insert with check (organizer_id = public.my_profile_id());
create policy "conventions_update" on public.conventions
  for update using (organizer_id = public.my_profile_id());
create policy "conventions_delete" on public.conventions
  for delete using (organizer_id = public.my_profile_id());

-- artist_conventions: public read; insert via RPC; artist can delete own row
create policy "artist_conventions_select" on public.artist_conventions
  for select using (true);
create policy "artist_conventions_delete" on public.artist_conventions
  for delete using (artist_id = public.my_profile_id());

-- studio_follows
create policy "studio_follows_select" on public.studio_follows
  for select using (follower_id = public.my_profile_id());
create policy "studio_follows_insert" on public.studio_follows
  for insert with check (follower_id = public.my_profile_id());
create policy "studio_follows_delete" on public.studio_follows
  for delete using (follower_id = public.my_profile_id());

-- convention_follows
create policy "convention_follows_select" on public.convention_follows
  for select using (follower_id = public.my_profile_id());
create policy "convention_follows_insert" on public.convention_follows
  for insert with check (follower_id = public.my_profile_id());
create policy "convention_follows_delete" on public.convention_follows
  for delete using (follower_id = public.my_profile_id());

-- promotions: replace existing insert/update/delete to support multi-source
drop policy if exists "promotions_insert" on public.promotions;
drop policy if exists "promotions_update" on public.promotions;
drop policy if exists "promotions_delete" on public.promotions;

create policy "promotions_insert" on public.promotions
  for insert with check (
    (artist_id is not null     and artist_id     = public.my_profile_id())
    or (studio_id is not null  and exists (select 1 from public.studios     s where s.id = studio_id     and s.owner_id       = public.my_profile_id()))
    or (convention_id is not null and exists (select 1 from public.conventions c where c.id = convention_id and c.organizer_id  = public.my_profile_id()))
  );

create policy "promotions_update" on public.promotions
  for update using (
    (artist_id     = public.my_profile_id())
    or (studio_id     is not null and exists (select 1 from public.studios     s where s.id = studio_id     and s.owner_id      = public.my_profile_id()))
    or (convention_id is not null and exists (select 1 from public.conventions c where c.id = convention_id and c.organizer_id = public.my_profile_id()))
  );

create policy "promotions_delete" on public.promotions
  for delete using (
    (artist_id     = public.my_profile_id())
    or (studio_id     is not null and exists (select 1 from public.studios     s where s.id = studio_id     and s.owner_id      = public.my_profile_id()))
    or (convention_id is not null and exists (select 1 from public.conventions c where c.id = convention_id and c.organizer_id = public.my_profile_id()))
  );

-- ── 8. SECURITY DEFINER RPCs ─────────────────────────────────

-- join_convention: same pattern as join_studio (migration 015)
create or replace function public.join_convention(
  p_convention_id uuid,
  p_status        public.convention_artist_status default 'pending'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
begin
  select id into v_profile_id
    from public.profiles
   where auth_user_id = auth.uid();

  if v_profile_id is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.artist_conventions (artist_id, convention_id, status)
  values (v_profile_id, p_convention_id, p_status)
  on conflict (artist_id, convention_id)
  do update set status = excluded.status;
end;
$$;

grant execute on function public.join_convention(uuid, public.convention_artist_status) to authenticated;

-- get_for_you_feed: unified feed RPC
-- Returns enriched promotion rows for everything the caller follows
create or replace function public.get_for_you_feed(
  p_limit  int default 30,
  p_offset int default 0
)
returns table (
  id            uuid,
  type          text,
  title         text,
  body          text,
  image_url     text,
  price         int,
  expires_at    date,
  location      text,
  created_at    timestamptz,
  author_kind   text,
  author_id     uuid,
  author_name   text,
  author_avatar text,
  author_slug   text
)
language sql
security definer
set search_path = ''
stable
as $$
  with caller as (
    select id from public.profiles where auth_user_id = auth.uid()
  ),
  followed_artists as (
    select following_id as entity_id
      from public.follows
     where follower_id = (select id from caller)
  ),
  followed_studios as (
    select studio_id as entity_id
      from public.studio_follows
     where follower_id = (select id from caller)
  ),
  followed_conventions as (
    select convention_id as entity_id
      from public.convention_follows
     where follower_id = (select id from caller)
  )
  select
    p.id,
    p.type::text,
    p.title,
    p.body,
    p.image_url,
    p.price,
    p.expires_at,
    p.location,
    p.created_at,
    case
      when p.artist_id     is not null then 'artist'
      when p.studio_id     is not null then 'studio'
      when p.convention_id is not null then 'convention'
    end as author_kind,
    coalesce(p.artist_id, p.studio_id, p.convention_id) as author_id,
    coalesce(pr.display_name, st.name, cv.name)          as author_name,
    coalesce(pr.avatar_url,   st.avatar_url, cv.cover_url) as author_avatar,
    coalesce(pr.username,     st.id::text,   cv.id::text)  as author_slug
  from public.promotions p
  left join public.profiles    pr on pr.id = p.artist_id
  left join public.studios     st on st.id = p.studio_id
  left join public.conventions cv on cv.id = p.convention_id
  where
       (p.artist_id     is not null and p.artist_id     in (select entity_id from followed_artists))
    or (p.studio_id     is not null and p.studio_id     in (select entity_id from followed_studios))
    or (p.convention_id is not null and p.convention_id in (select entity_id from followed_conventions))
  order by p.created_at desc
  limit  p_limit
  offset p_offset;
$$;

grant execute on function public.get_for_you_feed(int, int) to authenticated;

-- ── 9. Storage bucket for convention covers ──────────────────
insert into storage.buckets (id, name, public) values
  ('convention-covers', 'convention-covers', true)
on conflict do nothing;

create policy "convention_covers_select" on storage.objects
  for select using (bucket_id = 'convention-covers');
create policy "convention_covers_insert" on storage.objects
  for insert with check (bucket_id = 'convention-covers' and auth.uid() is not null);
create policy "convention_covers_delete" on storage.objects
  for delete using (bucket_id = 'convention-covers' and auth.uid() is not null);

-- ── Reload PostgREST schema cache ────────────────────────────
notify pgrst, 'reload schema';

-- ============================================================
-- End of migration 016
-- ============================================================
