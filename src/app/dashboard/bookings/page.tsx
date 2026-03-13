'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Calendar, ChevronDown, Loader2, Star } from 'lucide-react'
import type { Booking, BookingStatus } from '@/types'
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '@/lib/constants'
import { format } from 'date-fns'
import Link from 'next/link'

const STATUS_ORDER: BookingStatus[] = ['pending', 'confirmed', 'completed', 'declined']

export default function BookingsPage() {
  const { profile } = useAuthStore()
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const qc = useQueryClient()
  const supabase = createClient()

  const isArtist = profile?.role === 'artist'

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings', profile?.id, filter],
    queryFn: async () => {
      let q = supabase
        .from('bookings')
        .select(`
          *,
          artist:profiles!bookings_artist_id_fkey(id, display_name, username, avatar_url),
          client:profiles!bookings_client_id_fkey(id, display_name, username, avatar_url),
          booking_images(id, storage_path),
          review:reviews(id, rating, body)
        `)

      if (isArtist) q = q.eq('artist_id', profile!.id)
      else q = q.eq('client_id', profile!.id)

      if (filter !== 'all') q = q.eq('status', filter)
      q = q.order('created_at', { ascending: false })

      const { data } = await q
      return data as Booking[]
    },
    enabled: !!profile?.id,
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: BookingStatus; note?: string }) => {
      await supabase.from('bookings').update({ status, ...(note ? { artist_note: note } : {}) }).eq('id', id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings', profile?.id] }),
  })

  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewBody, setReviewBody] = useState('')

  const submitReview = useMutation({
    mutationFn: async ({ bookingId, artistId }: { bookingId: string; artistId: string }) => {
      await supabase.from('reviews').insert({
        booking_id: bookingId,
        artist_id: artistId,
        client_id: profile!.id,
        rating: reviewRating,
        body: reviewBody,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings', profile?.id] })
      setReviewBookingId(null)
      setReviewBody('')
      setReviewRating(5)
    },
  })

  if (!profile) return null

  const filteredBookings = bookings

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-white tracking-wide">
          {isArtist ? 'BOOKING REQUESTS' : 'MY BOOKINGS'}
        </h1>
        <p className="text-white/40 mt-1">{bookings.length} total</p>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {['all', ...STATUS_ORDER].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s as any)}
            className={`text-xs px-3 py-1.5 rounded-full border capitalize transition-all ${
              filter === s
                ? 'bg-[#e63946] border-[#e63946] text-white'
                : 'bg-white/5 border-white/10 text-white/50 hover:border-white/30'
            }`}
          >
            {s === 'all' ? 'All' : BOOKING_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="ink-card p-12 text-center text-white/20">
          <Calendar size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No bookings found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking) => {
            const other = isArtist ? booking.client as any : booking.artist as any
            const isExpanded = expandedId === booking.id
            return (
              <div key={booking.id} className="ink-card overflow-hidden">
                {/* Summary row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                  className="w-full flex items-center gap-4 p-4 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 font-display text-lg flex-shrink-0">
                    {other?.display_name?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-sm font-medium text-white truncate">{other?.display_name}</div>
                    <div className="text-xs text-white/40 truncate">{booking.description}</div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BOOKING_STATUS_COLORS[booking.status]}`}>
                      {BOOKING_STATUS_LABELS[booking.status]}
                    </span>
                    {booking.preferred_date_1 && (
                      <span className="text-xs text-white/30 hidden sm:block">
                        {format(new Date(booking.preferred_date_1), 'MMM d')}
                      </span>
                    )}
                    <ChevronDown size={16} className={`text-white/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-white/5 px-4 pb-4 pt-4 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                      {booking.body_placement && (
                        <div><span className="text-white/30 text-xs block mb-1">Placement</span>{booking.body_placement}</div>
                      )}
                      {booking.size && (
                        <div><span className="text-white/30 text-xs block mb-1">Size</span>{booking.size}</div>
                      )}
                      {booking.budget_range && (
                        <div><span className="text-white/30 text-xs block mb-1">Budget</span>{booking.budget_range}</div>
                      )}
                      {booking.preferred_date_1 && (
                        <div><span className="text-white/30 text-xs block mb-1">Date 1</span>{format(new Date(booking.preferred_date_1), 'MMM d, yyyy')}</div>
                      )}
                      {booking.preferred_date_2 && (
                        <div><span className="text-white/30 text-xs block mb-1">Date 2</span>{format(new Date(booking.preferred_date_2), 'MMM d, yyyy')}</div>
                      )}
                    </div>
                    <div>
                      <span className="text-white/30 text-xs block mb-1">Description</span>
                      <p className="text-sm text-white/70 leading-relaxed">{booking.description}</p>
                    </div>
                    {booking.artist_note && (
                      <div className="bg-white/5 rounded-lg p-3">
                        <span className="text-white/30 text-xs block mb-1">Artist Note</span>
                        <p className="text-sm text-white/70">{booking.artist_note}</p>
                      </div>
                    )}

                    {/* Artist actions */}
                    {isArtist && booking.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus.mutate({ id: booking.id, status: 'confirmed' })}
                          disabled={updateStatus.isPending}
                          className="flex-1 py-2 rounded-lg bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 text-sm font-medium hover:bg-emerald-400/20 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => updateStatus.mutate({ id: booking.id, status: 'declined' })}
                          disabled={updateStatus.isPending}
                          className="flex-1 py-2 rounded-lg bg-red-400/10 border border-red-400/30 text-red-400 text-sm font-medium hover:bg-red-400/20 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    {isArtist && booking.status === 'confirmed' && (
                      <button
                        onClick={() => updateStatus.mutate({ id: booking.id, status: 'completed' })}
                        disabled={updateStatus.isPending}
                        className="w-full py-2 rounded-lg bg-blue-400/10 border border-blue-400/30 text-blue-400 text-sm font-medium hover:bg-blue-400/20 transition-colors"
                      >
                        Mark Completed
                      </button>
                    )}

                    {/* Client: leave review */}
                    {!isArtist && booking.status === 'completed' && !(booking.review as any)?.length && (
                      <div>
                        {reviewBookingId === booking.id ? (
                          <div className="space-y-3">
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map(i => (
                                <button key={i} onClick={() => setReviewRating(i)}>
                                  <Star size={24} className={i <= reviewRating ? 'text-[#e63946] fill-current' : 'text-white/20 fill-current'} />
                                </button>
                              ))}
                            </div>
                            <textarea
                              value={reviewBody}
                              onChange={e => setReviewBody(e.target.value)}
                              placeholder="Share your experience..."
                              rows={2}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 resize-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => submitReview.mutate({ bookingId: booking.id, artistId: (booking.artist as any).id })}
                                disabled={submitReview.isPending}
                                className="flex-1 py-2 rounded-lg bg-[#e63946] text-white text-sm font-medium"
                              >
                                {submitReview.isPending ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Submit Review'}
                              </button>
                              <button onClick={() => setReviewBookingId(null)} className="px-4 py-2 rounded-lg bg-white/5 text-white/50 text-sm">
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReviewBookingId(booking.id)}
                            className="flex items-center gap-2 text-sm text-[#e63946] hover:text-[#ff5a65] transition-colors"
                          >
                            <Star size={14} /> Leave a Review
                          </button>
                        )}
                      </div>
                    )}

                    {/* Message link */}
                    <Link
                      href={`/dashboard/bookings/${booking.id}`}
                      className="text-xs text-white/30 hover:text-[#e63946] transition-colors"
                    >
                      View details & message →
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
