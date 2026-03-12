-- ============================================================
-- InkSnap — Initial Schema Migration
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

create type user_role as enum ('artist', 'client');
create type booking_status as enum ('pending', 'confirmed', 'declined', 'completed');
create type promotion_type as enum ('flash_deal', 'update', 'convention');

-- ============================================================
-- STUDIOS
-- ============================================================

create table studios (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  address       text,
  city          text not null,
  state         text,
  country       text not null default 'US',
  lat           double precision,
  lng           double precision,
  website       text,
  instagram     text,
  phone         text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================

create table profiles (
  id                  uuid primary key default gen_random_uuid(),
  auth_user_id        uuid not null unique references auth.users(id) on delete cascade,
  role                user_role not null,
  username            text not null unique,
  display_name        text not null,
  bio                 text,
  location            text,
  city                text,
  state               text,
  country             text default 'US',
  lat                 double precision,
  lng                 double precision,
  avatar_url          text,
  -- Artist-specific
  tattoo_styles       text[] default '{}',
  accepting_bookings  boolean not null default false,
  years_experience    int,
  hourly_rate         int,
  min_spend           int,
  instagram           text,
  website             text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index profiles_role_idx on profiles(role);
create index profiles_city_idx on profiles(city);
create index profiles_styles_idx on profiles using gin(tattoo_styles);
create index profiles_username_idx on profiles(username);

-- ============================================================
-- ARTIST ↔ STUDIO AFFILIATIONS
-- ============================================================

create table artist_studios (
  id          uuid primary key default gen_random_uuid(),
  artist_id   uuid not null references profiles(id) on delete cascade,
  studio_id   uuid not null references studios(id) on delete cascade,
  is_primary  boolean not null default false,
  start_date  date,
  end_date    date,
  created_at  timestamptz not null default now(),
  unique(artist_id, studio_id)
);

create index artist_studios_artist_idx on artist_studios(artist_id);
create index artist_studios_studio_idx on artist_studios(studio_id);

-- ============================================================
-- ARTIST AVAILABILITY
-- ============================================================

create table artist_availability (
  id          uuid primary key default gen_random_uuid(),
  artist_id   uuid not null references profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time  time not null,
  end_time    time not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique(artist_id, day_of_week)
);

create index artist_availability_artist_idx on artist_availability(artist_id);

-- ============================================================
-- PORTFOLIO IMAGES
-- ============================================================

create table portfolio_images (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid not null references profiles(id) on delete cascade,
  storage_path  text not null,
  caption       text,
  styles        text[] default '{}',
  display_order int not null default 0,
  created_at    timestamptz not null default now()
);

create index portfolio_images_artist_idx on portfolio_images(artist_id);

-- ============================================================
-- PROMOTIONS
-- ============================================================

create table promotions (
  id          uuid primary key default gen_random_uuid(),
  artist_id   uuid not null references profiles(id) on delete cascade,
  type        promotion_type not null,
  title       text not null,
  body        text,
  image_url   text,
  price       int,
  expires_at  date,
  location    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index promotions_artist_idx on promotions(artist_id);
create index promotions_expires_idx on promotions(expires_at);

-- ============================================================
-- BOOKINGS
-- ============================================================

create table bookings (
  id                uuid primary key default gen_random_uuid(),
  artist_id         uuid not null references profiles(id) on delete cascade,
  client_id         uuid not null references profiles(id) on delete cascade,
  status            booking_status not null default 'pending',
  description       text not null,
  body_placement    text,
  size              text,
  preferred_date_1  date,
  preferred_date_2  date,
  budget_range      text,
  artist_note       text,
  confirmed_date    date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index bookings_artist_idx on bookings(artist_id);
create index bookings_client_idx on bookings(client_id);
create index bookings_status_idx on bookings(status);

-- ============================================================
-- BOOKING REFERENCE IMAGES
-- ============================================================

create table booking_images (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references bookings(id) on delete cascade,
  storage_path  text not null,
  created_at    timestamptz not null default now()
);

create index booking_images_booking_idx on booking_images(booking_id);

-- ============================================================
-- REVIEWS
-- ============================================================

create table reviews (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null unique references bookings(id) on delete cascade,
  artist_id   uuid not null references profiles(id) on delete cascade,
  client_id   uuid not null references profiles(id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  body        text,
  created_at  timestamptz not null default now()
);

create index reviews_artist_idx on reviews(artist_id);
create index reviews_client_idx on reviews(client_id);

-- ============================================================
-- SOCIAL GRAPH
-- ============================================================

create table follows (
  id            uuid primary key default gen_random_uuid(),
  follower_id   uuid not null references profiles(id) on delete cascade,
  following_id  uuid not null references profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique(follower_id, following_id),
  check (follower_id != following_id)
);

create index follows_follower_idx on follows(follower_id);
create index follows_following_idx on follows(following_id);

create table saved_artists (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references profiles(id) on delete cascade,
  artist_id   uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(client_id, artist_id)
);

create index saved_artists_client_idx on saved_artists(client_id);

-- ============================================================
-- MESSAGING (Realtime-ready)
-- ============================================================

create table conversations (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table conversation_participants (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references conversations(id) on delete cascade,
  profile_id        uuid not null references profiles(id) on delete cascade,
  unread_count      int not null default 0,
  last_read_at      timestamptz,
  created_at        timestamptz not null default now(),
  unique(conversation_id, profile_id)
);

create index cp_conversation_idx on conversation_participants(conversation_id);
create index cp_profile_idx on conversation_participants(profile_id);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references profiles(id) on delete cascade,
  booking_id      uuid references bookings(id) on delete set null,
  body            text not null,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

create index messages_conversation_idx on messages(conversation_id);
create index messages_sender_idx on messages(sender_id);
create index messages_created_idx on messages(created_at desc);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at
create or replace function handle_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on profiles
  for each row execute procedure handle_updated_at();
create trigger bookings_updated_at before update on bookings
  for each row execute procedure handle_updated_at();
create trigger promotions_updated_at before update on promotions
  for each row execute procedure handle_updated_at();
create trigger studios_updated_at before update on studios
  for each row execute procedure handle_updated_at();

-- Auto-create profile row when a user signs up via Supabase Auth
create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (auth_user_id, role, username, display_name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'client'),
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'New User')
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure handle_new_user();

-- Increment unread_count on new message
create or replace function handle_new_message()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;

  update public.conversation_participants
  set unread_count = unread_count + 1
  where conversation_id = new.conversation_id
    and profile_id != new.sender_id;

  return new;
end;
$$;

create trigger on_new_message after insert on messages
  for each row execute procedure handle_new_message();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table studios enable row level security;
alter table artist_studios enable row level security;
alter table artist_availability enable row level security;
alter table portfolio_images enable row level security;
alter table promotions enable row level security;
alter table bookings enable row level security;
alter table booking_images enable row level security;
alter table reviews enable row level security;
alter table follows enable row level security;
alter table saved_artists enable row level security;
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;

-- Helper: get current user's profile id
create or replace function my_profile_id()
returns uuid language sql stable security definer
set search_path = ''
as $$
  select id from public.profiles where auth_user_id = auth.uid()
$$;

-- Profiles: public read, owner write
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (auth_user_id = auth.uid());
create policy "profiles_update" on profiles for update using (auth_user_id = auth.uid());

-- Studios: public read
create policy "studios_select" on studios for select using (true);
create policy "studios_insert" on studios for insert with check (auth.uid() is not null);

-- Artist studios
create policy "artist_studios_select" on artist_studios for select using (true);
create policy "artist_studios_insert" on artist_studios for insert
  with check (artist_id = my_profile_id());
create policy "artist_studios_delete" on artist_studios for delete
  using (artist_id = my_profile_id());

-- Availability
create policy "availability_select" on artist_availability for select using (true);
create policy "availability_insert" on artist_availability for insert
  with check (artist_id = my_profile_id());
create policy "availability_update" on artist_availability for update
  using (artist_id = my_profile_id());
create policy "availability_delete" on artist_availability for delete
  using (artist_id = my_profile_id());

-- Portfolio
create policy "portfolio_select" on portfolio_images for select using (true);
create policy "portfolio_insert" on portfolio_images for insert
  with check (artist_id = my_profile_id());
create policy "portfolio_delete" on portfolio_images for delete
  using (artist_id = my_profile_id());

-- Promotions
create policy "promotions_select" on promotions for select using (true);
create policy "promotions_insert" on promotions for insert
  with check (artist_id = my_profile_id());
create policy "promotions_update" on promotions for update
  using (artist_id = my_profile_id());
create policy "promotions_delete" on promotions for delete
  using (artist_id = my_profile_id());

-- Bookings
create policy "bookings_select" on bookings for select
  using (artist_id = my_profile_id() or client_id = my_profile_id());
create policy "bookings_insert" on bookings for insert
  with check (client_id = my_profile_id());
create policy "bookings_update" on bookings for update
  using (artist_id = my_profile_id() or client_id = my_profile_id());

-- Booking images
create policy "booking_images_select" on booking_images for select
  using (exists (
    select 1 from bookings b
    where b.id = booking_id
      and (b.artist_id = my_profile_id() or b.client_id = my_profile_id())
  ));
create policy "booking_images_insert" on booking_images for insert
  with check (exists (
    select 1 from bookings b
    where b.id = booking_id and b.client_id = my_profile_id()
  ));

-- Reviews
create policy "reviews_select" on reviews for select using (true);
create policy "reviews_insert" on reviews for insert
  with check (
    client_id = my_profile_id()
    and exists (
      select 1 from bookings b
      where b.id = booking_id
        and b.client_id = my_profile_id()
        and b.status = 'completed'
    )
  );

-- Follows
create policy "follows_select" on follows for select using (true);
create policy "follows_insert" on follows for insert
  with check (follower_id = my_profile_id());
create policy "follows_delete" on follows for delete
  using (follower_id = my_profile_id());

-- Saved artists
create policy "saved_select" on saved_artists for select
  using (client_id = my_profile_id());
create policy "saved_insert" on saved_artists for insert
  with check (client_id = my_profile_id());
create policy "saved_delete" on saved_artists for delete
  using (client_id = my_profile_id());

-- Conversations
create policy "conversations_select" on conversations for select
  using (exists (
    select 1 from conversation_participants cp
    where cp.conversation_id = id and cp.profile_id = my_profile_id()
  ));
create policy "conversations_insert" on conversations for insert
  with check (auth.uid() is not null);

-- Conversation participants
create policy "cp_select" on conversation_participants for select
  using (exists (
    select 1 from conversation_participants cp2
    where cp2.conversation_id = conversation_id and cp2.profile_id = my_profile_id()
  ));
create policy "cp_insert" on conversation_participants for insert
  with check (auth.uid() is not null);
create policy "cp_update" on conversation_participants for update
  using (profile_id = my_profile_id());

-- Messages
create policy "messages_select" on messages for select
  using (exists (
    select 1 from conversation_participants cp
    where cp.conversation_id = conversation_id and cp.profile_id = my_profile_id()
  ));
create policy "messages_insert" on messages for insert
  with check (
    sender_id = my_profile_id()
    and exists (
      select 1 from conversation_participants cp
      where cp.conversation_id = conversation_id and cp.profile_id = my_profile_id()
    )
  );

-- ============================================================
-- TATTOO STYLES (reference data)
-- ============================================================

create table tattoo_styles (
  slug  text primary key,
  label text not null
);

insert into tattoo_styles (slug, label) values
  ('traditional', 'Traditional'),
  ('neo_traditional', 'Neo-Traditional'),
  ('realism', 'Realism'),
  ('blackwork', 'Blackwork'),
  ('fine_line', 'Fine Line'),
  ('watercolor', 'Watercolor'),
  ('japanese', 'Japanese'),
  ('tribal', 'Tribal'),
  ('geometric', 'Geometric'),
  ('illustrative', 'Illustrative'),
  ('surrealism', 'Surrealism'),
  ('dotwork', 'Dotwork'),
  ('new_school', 'New School'),
  ('chicano', 'Chicano'),
  ('biomechanical', 'Biomechanical'),
  ('lettering', 'Lettering'),
  ('portrait', 'Portrait'),
  ('minimalist', 'Minimalist'),
  ('nordic', 'Nordic / Viking'),
  ('trash_polka', 'Trash Polka');

alter table tattoo_styles enable row level security;
create policy "styles_select" on tattoo_styles for select using (true);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

insert into storage.buckets (id, name, public) values
  ('portfolio', 'portfolio', true),
  ('avatars', 'avatars', true),
  ('booking-refs', 'booking-refs', false)
on conflict do nothing;

-- Portfolio: public read, authenticated upload
create policy "portfolio_storage_select" on storage.objects
  for select using (bucket_id = 'portfolio');
create policy "portfolio_storage_insert" on storage.objects
  for insert with check (bucket_id = 'portfolio' and auth.uid() is not null);
create policy "portfolio_storage_delete" on storage.objects
  for delete using (bucket_id = 'portfolio' and auth.uid() is not null);

-- Avatars: public read, authenticated upload
create policy "avatars_storage_select" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars_storage_insert" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid() is not null);
create policy "avatars_storage_delete" on storage.objects
  for delete using (bucket_id = 'avatars' and auth.uid() is not null);

-- Booking refs: private, booking parties only
create policy "booking_refs_storage_select" on storage.objects
  for select using (bucket_id = 'booking-refs' and auth.uid() is not null);
create policy "booking_refs_storage_insert" on storage.objects
  for insert with check (bucket_id = 'booking-refs' and auth.uid() is not null);

-- ============================================================
-- REALTIME
-- ============================================================

alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversation_participants;
alter publication supabase_realtime add table bookings;
