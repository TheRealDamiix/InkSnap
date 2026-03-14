'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { BookingStatus } from '../bookings.types'

// ─────────────────────────────────────────────────────────────────────────────
// useUpdateBookingStatus
//
// bookingId (constructor) — optional, used by the detail page (single booking)
// id (payload)            — optional override, used by the list page (many bookings)
// Payload `id` wins when both are present.
// ─────────────────────────────────────────────────────────────────────────────

export function useUpdateBookingStatus(
  profileId: string | undefined,
  bookingId?: string
) {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
      note,
    }: {
      id?: string
      status: BookingStatus
      note?: string
    }) => {
      const targetId = id ?? bookingId
      if (!targetId) throw new Error('No booking ID provided')
      await supabase
        .from('bookings')
        .update({ status, ...(note ? { artist_note: note } : {}) })
        .eq('id', targetId)
    },
    onSuccess: (_, { id }) => {
      const targetId = id ?? bookingId
      qc.invalidateQueries({ queryKey: ['booking-detail', targetId] })
      qc.invalidateQueries({ queryKey: ['bookings', profileId] })
      qc.invalidateQueries({ queryKey: ['artist-stats', profileId] })
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// useSubmitReview
//
// bookingId (constructor) — optional, used by the detail page
// bookingId (payload)     — optional override, used by the list page
// All review data (artistId, rating, body) always comes from the payload.
// ─────────────────────────────────────────────────────────────────────────────

export function useSubmitReview(
  profileId: string | undefined,
  bookingId?: string
) {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      bookingId: payloadBookingId,
      artistId,
      rating,
      body,
    }: {
      bookingId?: string
      artistId: string
      rating: number
      body: string
    }) => {
      const targetId = payloadBookingId ?? bookingId
      if (!targetId) throw new Error('No booking ID provided')
      await supabase.from('reviews').insert({
        booking_id: targetId,
        artist_id: artistId,
        client_id: profileId,
        rating,
        body,
      })
    },
    onSuccess: (_, { bookingId: payloadId }) => {
      const targetId = payloadId ?? bookingId
      qc.invalidateQueries({ queryKey: ['booking-detail', targetId] })
      qc.invalidateQueries({ queryKey: ['bookings', profileId] })
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// useOpenConversation
//
// myProfileId — from auth store, known at hook creation time
// otherProfileId — always passed in the payload (computed from booking data)
// ─────────────────────────────────────────────────────────────────────────────

export function useOpenConversation(myProfileId: string | undefined) {
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ otherProfileId }: { otherProfileId: string }) => {
      if (!myProfileId) throw new Error('Not authenticated')

      // create_conversation is a SECURITY DEFINER RPC (migration 012).
      // It finds or creates a 1-1 conversation atomically, inserting
      // BOTH participant rows as the function owner — bypassing the
      // participants_insert RLS which only allows each user to insert
      // their own row. Without this, the partner row is rejected and
      // the conversation is left with zero participants, causing the
      // subsequent messages INSERT to fail with 42501.
      const { data: convId, error } = await supabase
        .rpc('create_conversation', { p_other_profile_id: otherProfileId })

      if (error) throw error
      return convId as string
    },
    onSuccess: (convId) => {
      window.location.href = `/messages/${convId}`
    },
  })
}
