export type UserRole = 'artist' | 'client'
export type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'completed'
export type PromotionType = 'flash_deal' | 'update' | 'convention'

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

export interface PortfolioImage {
  id: string
  artist_id: string
  storage_path: string
  caption: string | null
  styles: string[]
  display_order: number
  created_at: string
  // Computed
  url?: string
}

export interface Promotion {
  id: string
  artist_id: string
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
}

export interface Booking {
  id: string
  artist_id: string
  client_id: string
  status: BookingStatus
  description: string
  body_placement: string | null
  size: string | null
  preferred_date_1: string | null
  preferred_date_2: string | null
  budget_range: string | null
  artist_note: string | null
  confirmed_date: string | null
  created_at: string
  updated_at: string
  // Relations
  artist?: Profile
  client?: Profile
  booking_images?: BookingImage[]
  review?: Review
}

export interface BookingImage {
  id: string
  booking_id: string
  storage_path: string
  created_at: string
  url?: string
}

export interface Review {
  id: string
  booking_id: string
  artist_id: string
  client_id: string
  rating: number
  body: string | null
  created_at: string
  client?: Profile
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

export interface Conversation {
  id: string
  created_at: string
  last_message_at: string
  participants?: ConversationParticipant[]
  last_message?: Message
}

export interface ConversationParticipant {
  id: string
  conversation_id: string
  profile_id: string
  unread_count: number
  last_read_at: string | null
  created_at: string
  profile?: Profile
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  booking_id: string | null
  body: string
  is_read: boolean
  created_at: string
  sender?: Profile
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

export interface BookingRequestForm {
  description: string
  body_placement: string
  size: string
  preferred_date_1: string
  preferred_date_2: string
  budget_range: string
  reference_images?: File[]
}
