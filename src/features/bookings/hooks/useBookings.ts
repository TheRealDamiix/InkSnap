'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Booking, BookingDetail, BookingStatus } from '../bookings.types'

// ─────────────────────────────────────────────────────────────────────────────
// useBookings — powers the /dashboard/bookings list page
// ─────────────────────────────────────────────────────────────────────────────

export function useBookings(
  profileId: string | undefined,
  role: 'artist' | 'client' | undefined,
  filter: BookingStatus | 'all'
) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['bookings', profileId, filter],
    queryFn: async (): Promise<Booking[]> => {
      let q = supabase
        .from('bookings')
        .select(`
          *,
          artist:profiles!bookings_artist_id_fkey(id, display_name, username, avatar_url),
          client:profiles!bookings_client_id_fkey(id, display_name, username, avatar_url),
          booking_images(id, storage_path),
          review:reviews(id, rating, body)
        `)

      if (role === 'artist') q = q.eq('artist_id', profileId!)
      else q = q.eq('client_id', profileId!)

      if (filter !== 'all') q = q.eq('status', filter)
      q = q.order('created_at', { ascending: false })

      const { data } = await q
      return (data ?? []) as Booking[]
    },
    enabled: !!profileId && !!role,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// useBookingDetail — powers the /dashboard/bookings/[id] detail page
// Loads booking + partner profiles + signed reference image URLs
// ─────────────────────────────────────────────────────────────────────────────

export function useBookingDetail(
  bookingId: string | undefined,
  profileId: string | undefined
) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['booking-detail', bookingId],
    queryFn: async (): Promise<BookingDetail | null> => {
      const { data } = await supabase
        .from('bookings')
        .select(`
          *,
          artist:profiles!bookings_artist_id_fkey(id, display_name, username, avatar_url, city),
          client:profiles!bookings_client_id_fkey(id, display_name, username, avatar_url),
          review:reviews(id, rating, body)
        `)
        .eq('id', bookingId!)
        .single()

      if (!data) return null

      // Fetch reference images + generate 1-hour signed URLs
      const { data: images } = await supabase
        .from('booking_images')
        .select('id, storage_path')
        .eq('booking_id', bookingId!)

      const signedImages: { id: string; url: string }[] = []
      for (const img of images ?? []) {
        const { data: signed } = await supabase.storage
          .from('booking-refs')
          .createSignedUrl(img.storage_path, 3600)
        if (signed?.signedUrl) {
          signedImages.push({ id: img.id, url: signed.signedUrl })
        }
      }

      return { ...(data as Booking), signedImages }
    },
    enabled: !!profileId && !!bookingId,
  })
}
