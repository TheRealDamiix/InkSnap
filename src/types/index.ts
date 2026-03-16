import type { PortfolioImage } from '@/features/portfolio'
import type { Review } from '@/features/bookings'

export type UserRole = 'artist' | 'client'
export type PromotionType = 'flash_deal' | 'update' | 'convention' | 'studio_post'

export interface Profile {
  id: string
  auth_user_id: string
  role: UserRole
  username: string
  display_name: string
  bio: string | null
  location: string | null
  city: string | null
  state: string | null
  country: string
  lat: number | null
  lng: number | null
  avatar_url: string | null
  tattoo_styles: string[]
  accepting_bookings: boolean
  years_experience: number | null
  hourly_rate: number | null
  min_spend: number | null
  instagram: string | null
  website: string | null
  created_at: string
  updated_at: string
}

export interface Studio {
  id: string
  owner_id: string | null
  name: string
  address: string | null
  city: string
  state: string | null
  country: string
  lat: number | null
  lng: number | null
  website: string | null
  instagram: string | null
  phone: string | null
  avatar_url: string | null
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface ArtistStudio {
  id: string
  artist_id: string
  studio_id: string
  is_primary: boolean
  start_date: string | null
  end_date: string | null
  created_at: string
  studio?: Studio
}

export interface ArtistAvailability {
  id: string
  artist_id: string
  day_of_week: number // 0-6, 0=Sunday
  start_time: string
  end_time: string
  is_active: boolean
  created_at: string
}

export interface Promotion {
  id: string
  artist_id: string | null
  studio_id: string | null
  convention_id: string | null
  type: PromotionType
  title: string
  body: string | null
  image_url: string | null
  price: number | null
  expires_at: string | null
  location: string | null
  created_at: string
  updated_at: string
  artist?: Profile
  studio?: Studio
}

export interface Follow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}

export interface SavedArtist {
  id: string
  client_id: string
  artist_id: string
  created_at: string
  artist?: Profile
}

export interface TattooStyle {
  slug: string
  label: string
}

// ─── Extended / View types ─────────────────────────────────

export interface ArtistProfile extends Profile {
  studios?: ArtistStudio[]
  portfolio?: PortfolioImage[]
  reviews?: Review[]
  avg_rating?: number
  review_count?: number
  follower_count?: number
}

// Artist row as it appears on a studio's affiliated artists list
export interface StudioArtist extends Profile {
  is_primary: boolean
  portfolio_cover?: string | null   // first portfolio image storage_path
}

// Studio with its affiliated artists — used on the studio profile page
export interface StudioWithArtists extends Studio {
  artists: StudioArtist[]
}

// ─── Conventions ───────────────────────────────────────────

export type ConventionArtistStatus = 'pending' | 'confirmed'

export interface Convention {
  id: string
  name: string
  description: string | null
  organizer_id: string
  studio_id: string | null
  city: string | null
  venue: string | null
  start_date: string
  end_date: string
  cover_url: string | null
  created_at: string
  updated_at: string
}

export interface ArtistConvention {
  artist_id: string
  convention_id: string
  status: ConventionArtistStatus
  created_at: string
}

export interface ConventionWithArtists extends Convention {
  artist_count: number
  artist_previews: Array<{ id: string; display_name: string; avatar_url: string | null }>
}

// ─── Follow tables ─────────────────────────────────────────

export interface StudioFollow {
  follower_id: string
  studio_id: string
  created_at: string
}

export interface ConventionFollow {
  follower_id: string
  convention_id: string
  created_at: string
}

// ─── For You Feed ──────────────────────────────────────────

export type FeedAuthorKind = 'artist' | 'studio' | 'convention'

export interface FeedPost {
  id: string
  type: PromotionType
  title: string
  body: string | null
  image_url: string | null
  price: number | null
  expires_at: string | null
  location: string | null
  created_at: string
  author_kind: FeedAuthorKind
  author_id: string
  author_name: string
  author_avatar: string | null
  /** username slug for artists; id for studios/conventions */
  author_slug: string
}
