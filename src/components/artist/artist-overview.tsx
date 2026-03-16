'use client'

import { useAuthStore } from '@/lib/stores/auth'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Calendar, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import type { Booking } from '@/features/bookings'
import { useUpdateBookingStatus } from '@/features/bookings'
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '@/lib/constants'
import { formatDistanceToNow } from 'date-fns'
import { ForYouFeed } from '@/features/feed'

export function ArtistOverview() {
  const { profile } = useAuthStore()
  const supabase = createClient()
  const updateStatus = useUpdateBookingStatus(profile?.id)

  const { data: recentBookings, isLoading } = useQuery({
    queryKey: ['artist-recent-bookings', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*, client:profiles!bookings_client_id_fkey(id, display_name, username, avatar_url)')
        .eq('artist_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(10)
      return (data ?? []) as Booking[]
    },
    enabled: !!profile?.id,
  })

  if (!profile) return null

  return (
    <div>
      {/* ── Feed header ───────────────────────────────────────── */}
      <div className="sticky top-0 lg:top-0 z-20 px-4 py-4 border-b border-white/[0.06] bg-[#0a0a0b]/80 backdrop-blur-md flex items-center justify-between">
        <h1 className="font-display text-xl text-white tracking-wider">HOME</h1>
        <Link
          href="/dashboard/bookings"
          className="text-[11px] text-white/30 hover:text-[#e63946] transition-colors uppercase tracking-wider"
        >
          All Bookings →
        </Link>
      </div>

      {/* ── Feed body ─────────────────────────────────────────── */}
      {isLoading ? (
        <div className="divide-y divide-white/[0.06]">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-3 px-4 py-4">
              <div className="skeleton w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="skeleton h-3 w-36 rounded" />
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-2/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : !recentBookings?.length ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <Calendar size={40} className="text-white/10 mb-4" />
          <p className="text-white/30 text-sm font-medium">No booking requests yet</p>
          <p className="text-white/20 text-xs mt-1 max-w-xs">
            Share your profile link with clients to start receiving requests.
          </p>
          <Link
            href={`/artist/${profile.username}`}
            className="mt-5 flex items-center gap-1.5 text-sm text-[#e63946] hover:underline"
          >
            View your public profile <ArrowRight size={13} />
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.06]">
          {recentBookings.map((booking) => {
            const client = booking.client as any
            const isPending = booking.status === 'pending'
            const isConfirmed = booking.status === 'confirmed'

            return (
              <div
                key={booking.id}
                className="flex gap-3 px-4 py-4 hover:bg-white/[0.02] transition-colors"
              >
                {/* Avatar — links to booking detail */}
                <Link href={`/dashboard/bookings/${booking.id}`} className="shrink-0 mt-0.5">
                  <div className="w-10 h-10 rounded-full bg-[#e63946]/10 flex items-center justify-center text-[#e63946] font-display text-lg overflow-hidden">
                    {client?.avatar_url
                      ? <img src={client.avatar_url} alt="" className="w-full h-full object-cover" />
                      : (client?.display_name?.[0] ?? '?')
                    }
                  </div>
                </Link>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Name · timestamp · status */}
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <Link
                      href={`/dashboard/bookings/${booking.id}`}
                      className="font-semibold text-[15px] text-white hover:underline truncate"
                    >
                      {client?.display_name}
                    </Link>
                    <span className="text-white/20 text-sm shrink-0">·</span>
                    <span className="text-white/30 text-[13px] shrink-0">
                      {formatDistanceToNow(new Date(booking.created_at), { addSuffix: true })}
                    </span>
                    <span className={`ml-auto shrink-0 text-[11px] px-2 py-0.5 rounded-full font-medium ${BOOKING_STATUS_COLORS[booking.status]}`}>
                      {BOOKING_STATUS_LABELS[booking.status]}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-white/70 text-[15px] mt-0.5 leading-snug line-clamp-2">
                    {booking.description}
                  </p>

                  {/* Meta pills */}
                  {(booking.body_placement || booking.size || booking.budget_range) && (
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
                      {booking.body_placement && (
                        <span className="text-xs text-white/30">{booking.body_placement}</span>
                      )}
                      {booking.size && (
                        <span className="text-xs text-white/30">{booking.size}</span>
                      )}
                      {booking.budget_range && (
                        <span className="text-xs text-[#f5c518]/70">{booking.budget_range}</span>
                      )}
                    </div>
                  )}

                  {/* Action row */}
                  <div className="flex items-center gap-2 mt-3">
                    {isPending && (
                      <>
                        <button
                          onClick={() => updateStatus.mutate({ id: booking.id, status: 'confirmed' })}
                          disabled={updateStatus.isPending}
                          className="px-4 py-1.5 rounded-full border border-emerald-400/40 text-emerald-400 text-xs font-medium hover:bg-emerald-400/10 transition-colors disabled:opacity-40"
                        >
                          {updateStatus.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Confirm'}
                        </button>
                        <button
                          onClick={() => updateStatus.mutate({ id: booking.id, status: 'declined' })}
                          disabled={updateStatus.isPending}
                          className="px-4 py-1.5 rounded-full border border-red-400/40 text-red-400 text-xs font-medium hover:bg-red-400/10 transition-colors disabled:opacity-40"
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {isConfirmed && (
                      <button
                        onClick={() => updateStatus.mutate({ id: booking.id, status: 'completed' })}
                        disabled={updateStatus.isPending}
                        className="px-4 py-1.5 rounded-full border border-blue-400/40 text-blue-400 text-xs font-medium hover:bg-blue-400/10 transition-colors disabled:opacity-40"
                      >
                        {updateStatus.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Mark Completed'}
                      </button>
                    )}
                    <Link
                      href={`/dashboard/bookings/${booking.id}`}
                      className="ml-auto text-xs text-white/25 hover:text-[#e63946] transition-colors"
                    >
                      Details →
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}

          {/* View all footer */}
          <Link
            href="/dashboard/bookings"
            className="flex items-center justify-center gap-2 px-4 py-5 text-sm text-white/40 hover:text-[#e63946] hover:bg-white/[0.02] transition-colors"
          >
            View all bookings <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* ── For You Feed ──────────────────────────────────────── */}
      <div>
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <p className="text-[11px] text-white/30 uppercase tracking-[0.18em] font-medium">For You</p>
        </div>
        <div className="px-4 py-4">
          <ForYouFeed showFilters />
        </div>
      </div>
    </div>
  )
}
