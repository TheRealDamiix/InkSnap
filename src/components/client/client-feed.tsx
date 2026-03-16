'use client'

import { useAuthStore } from '@/lib/stores/auth'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Search, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { Booking } from '@/features/bookings'
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '@/lib/constants'
import { formatDistanceToNow } from 'date-fns'
import { ForYouFeed } from '@/features/feed'

export function ClientFeed() {
  const { profile } = useAuthStore()
  const supabase = createClient()

  // Active bookings (up to 3)
  const { data: activeBookings, isLoading: loadingBookings } = useQuery({
    queryKey: ['client-bookings', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*, artist:profiles!bookings_artist_id_fkey(id, display_name, username, avatar_url)')
        .eq('client_id', profile!.id)
        .in('status', ['pending', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(3)
      return (data ?? []) as Booking[]
    },
    enabled: !!profile?.id,
  })

  if (!profile) return null

  const hasActiveBookings = activeBookings && activeBookings.length > 0

  return (
    <div>
      {/* ── Feed header ───────────────────────────────────────── */}
      <div className="sticky top-0 lg:top-0 z-20 px-4 py-4 border-b border-white/[0.06] bg-[#0a0a0b]/80 backdrop-blur-md flex items-center justify-between">
        <h1 className="font-display text-xl text-white tracking-wider">
          HEY, {profile.display_name.toUpperCase().split(' ')[0]}
        </h1>
        <Link
          href="/search"
          className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-[#e63946] transition-colors uppercase tracking-wider"
        >
          <Search size={12} />
          Find Artists
        </Link>
      </div>

      {/* ── Active bookings section ───────────────────────────── */}
      {(loadingBookings || hasActiveBookings) && (
        <div>
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <p className="text-[11px] text-white/30 uppercase tracking-[0.18em] font-medium">Active Bookings</p>
          </div>

          {loadingBookings ? (
            <div className="divide-y divide-white/[0.06]">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex gap-3 px-4 py-4">
                  <div className="skeleton w-10 h-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="skeleton h-3 w-28 rounded" />
                    <div className="skeleton h-3 w-full rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {activeBookings!.map((booking) => {
                const artist = booking.artist as any
                return (
                  <Link
                    key={booking.id}
                    href={`/dashboard/bookings/${booking.id}`}
                    className="flex gap-3 px-4 py-4 hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Artist avatar */}
                    <div className="w-10 h-10 rounded-full bg-[#e63946]/10 flex items-center justify-center text-[#e63946] font-display text-lg shrink-0 mt-0.5 overflow-hidden">
                      {artist?.avatar_url
                        ? <img src={artist.avatar_url} alt="" className="w-full h-full object-cover" />
                        : (artist?.display_name?.[0] ?? '?')
                      }
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-[15px] text-white truncate">{artist?.display_name}</span>
                        <span className="text-white/20 text-sm shrink-0">·</span>
                        <span className="text-white/30 text-[13px] shrink-0">
                          {formatDistanceToNow(new Date(booking.created_at), { addSuffix: true })}
                        </span>
                        <span className={`ml-auto shrink-0 text-[11px] px-2 py-0.5 rounded-full font-medium ${BOOKING_STATUS_COLORS[booking.status]}`}>
                          {BOOKING_STATUS_LABELS[booking.status]}
                        </span>
                      </div>
                      <p className="text-white/60 text-[15px] mt-0.5 leading-snug line-clamp-1">
                        {booking.description}
                      </p>
                    </div>
                  </Link>
                )
              })}

              <Link
                href="/dashboard/bookings"
                className="flex items-center justify-center gap-2 px-4 py-4 text-sm text-white/30 hover:text-[#e63946] hover:bg-white/[0.02] transition-colors"
              >
                View all bookings <ArrowRight size={13} />
              </Link>
            </div>
          )}
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
