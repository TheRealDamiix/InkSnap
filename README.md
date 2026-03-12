# InkSnap 🖊️

A localized dual-sided marketplace connecting tattoo artists with clients.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + custom design system (Bebas Neue + DM Sans)
- **State**: Zustand (auth) + TanStack Query v5 (server state)
- **Forms**: React Hook Form + Zod
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Maps**: Mapbox GL JS

---

## Setup

### 1. Clone & Install

```bash
git clone <repo>
cd inksnap
npm install
```

### 2. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migration:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
3. Go to **Storage** and create these buckets (all public):
   - `avatars`
   - `portfolio`
   - `booking-refs`
   - `promotions`
4. Copy your project URL and anon key

### 3. Mapbox Setup

1. Sign up at [mapbox.com](https://mapbox.com)
2. Create a public access token

### 4. Environment Variables

```bash
cp .env.local.example .env.local
```

Fill in:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx              # Sidebar nav
│   │   ├── page.tsx                # Overview (artist) or Feed (client)
│   │   ├── portfolio/page.tsx      # Artist portfolio management
│   │   ├── bookings/page.tsx       # Booking requests
│   │   ├── promotions/page.tsx     # Flash deals & updates
│   │   ├── saved/page.tsx          # Client saved artists
│   │   └── profile/page.tsx        # Edit profile
│   ├── artist/[username]/page.tsx  # Public artist profile
│   ├── search/page.tsx             # Discovery + search
│   └── messages/
│       ├── page.tsx                # Inbox
│       └── [id]/page.tsx           # Conversation (Realtime)
├── components/
│   ├── artist/
│   │   ├── artist-overview.tsx
│   │   └── artist-profile-client.tsx
│   ├── client/
│   │   └── client-feed.tsx
│   ├── booking/
│   │   └── booking-modal.tsx
│   ├── messaging/
│   │   └── unread-badge.tsx        # Realtime unread count
│   ├── providers.tsx               # QueryClient + Auth
│   └── ui/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── stores/auth.ts              # Zustand auth store
│   ├── storage.ts                  # Supabase Storage helpers
│   └── constants.ts                # Styles, status labels
├── types/index.ts                  # All TypeScript types
└── middleware.ts                   # Auth + route protection
```

---

## Key Features Implemented

| Feature | Status |
|---|---|
| Auth (signup/login as artist or client) | ✅ |
| Dual-role dashboards | ✅ |
| Artist public profile | ✅ |
| Portfolio upload & management | ✅ |
| Booking request form | ✅ |
| Booking status management (artist) | ✅ |
| Client review on completed bookings | ✅ |
| Promotions (flash deals, updates, conventions) | ✅ |
| Follow / unfollow artists | ✅ |
| Save / bookmark artists | ✅ |
| Client feed (followed artists' promotions) | ✅ |
| Real-time messaging (Supabase Realtime) | ✅ |
| Unread message badges (Realtime) | ✅ |
| Artist search (name, city, styles) | ✅ |
| Multi-studio affiliation | ✅ |
| Structured availability (schema ready) | ✅ |
| Mapbox map view (search page) | 🔧 Scaffold ready |

---

## Supabase Storage Buckets

Create these in your Supabase project → Storage:

| Bucket | Access | Purpose |
|---|---|---|
| `avatars` | Public | Profile photos |
| `portfolio` | Public | Artist portfolio images |
| `booking-refs` | Private | Booking reference images |
| `promotions` | Public | Promo images |

---

## Realtime Tables

These tables have Realtime enabled via the migration:
- `messages` — live chat
- `conversation_participants` — unread badge updates
- `bookings` — status updates

---

## Database Schema Overview

15 tables across 5 domains:
1. **Identity**: `profiles`, `studios`, `artist_studios`
2. **Availability**: `artist_availability`
3. **Portfolio & Promotions**: `portfolio_images`, `promotions`
4. **Bookings**: `bookings`, `booking_images`, `reviews`
5. **Social Graph**: `follows`, `saved_artists`
6. **Messaging**: `conversations`, `conversation_participants`, `messages`
