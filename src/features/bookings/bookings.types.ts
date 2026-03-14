// ─────────────────────────────────────────────────────────────────────────────
// Bookings domain types
// Booking-specific types live here; Profile stays in @/types (cross-feature)
// ─────────────────────────────────────────────────────────────────────────────

export type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'completed'

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
  // Relations (populated by Supabase joins)
  artist?: {
    id: string
    display_name: string
    username: string
    avatar_url: string | null
    city?: string | null
  }
  client?: {
    id: string
    display_name: string
    username: string
    avatar_url: string | null
  }
  booking_images?: BookingImage[]
  review?: Review[]
}

/** Booking with server-side signed image URLs — used by the detail page */
export interface BookingDetail extends Booking {
  signedImages: { id: string; url: string }[]
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
