'use client'

import { useAuthStore } from '@/lib/stores/auth'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Search, Zap, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import type { Promotion } from '@/types'
import type { Booking } from '@/features/bookings'
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '@/lib/constants'
import { formatDistanceToNow, format } from 'date-fns'

const PROMO_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  flash_deal:  { label: '⚡ Flash Deal',  color: 'text-[#f5c518] bg-[#f5c518]/10' },
  convention:  { label: '📍 Convention',  color: 'text-purple-400 bg-purple-400/10' },
  update:      { label: '📢 Update',       color: 'text-white/50 bg-white/5' },
}

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

  // Following feed
  const { data: feed, isLoading: loadingFeed } = useQuery({
    queryKey: ['client-feed', profile?.id],
    queryFn: async () => {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', profile!.id)

      const followedIds = follows?.map(f => f.following_id) ?? []
      if (followedIds.length === 0) return []

      const { data } = await supabase
        .from('promotions')
        .select('*, artist:profiles!promotions_artist_id_fkey(display_name, username, avatar_url)')
        .in('artist_id', followedIds)
        .order('created_at', { ascending: false })
        .limit(20)
      return (data ?? []) as Promotion[]
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

      {/* ── Following feed ────────────────────────────────────── */}
      <div>
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <p className="text-[11px] text-white/30 uppercase tracking-[0.18em] font-medium">Following Feed</p>
        </div>

        {loadingFeed ? (
          <div className="divide-y divide-white/[0.06]">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3 px-4 py-4">
                <div className="skeleton w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="skeleton h-3 w-36 rounded" />
                  <div className="skeleton h-3 w-full rounded" />
                  <div className="skeleton h-3 w-4/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : !feed?.length ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <Zap size={40} className="text-white/10 mb-4" />
            <p className="text-white/30 text-sm font-medium">Your feed is empty</p>
            <p className="text-white/20 text-xs mt-1 max-w-xs">
              Follow artists to see their flash deals and updates here.
            </p>
            <Link
              href="/search"
              className="mt-5 flex items-center gap-1.5 text-sm text-[#e63946] hover:underline"
            >
              Explore artists <ArrowRight size={13} />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {feed.map((promo) => {
              const artist = promo.artist as any
              const typeInfo = PROMO_TYPE_LABELS[promo.type] ?? PROMO_TYPE_LABELS.update

              return (
                <div
                  key={promo.id}
                  className="flex gap-3 px-4 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Artist avatar — links to artist profile */}
                  <Link href={`/artist/${artist?.username}`} className="shrink-0 mt-0.5">
                    <div className="w-10 h-10 rounded-full bg-[#e63946]/10 flex items-center justify-center text-[#e63946] font-display text-lg overflow-hidden">
                      {artist?.avatar_url
                        ? <img src={artist.avatar_url} alt="" className="w-full h-full object-cover" />
                        : (artist?.display_name?.[0] ?? '?')
                      }
                    </div>
                  </Link>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link
                        href={`/artist/${artist?.username}`}
                        className="font-semibold text-[15px] text-white hover:underline truncate"
                      >
                        {artist?.display_name}
                      </Link>
                      <span className="text-white/20 text-sm shrink-0">·</span>
                      <span className="text-white/30 text-[13px] shrink-0">
                        {formatDistanceToNow(new Date(promo.created_at), { addSuffix: true })}
                      </span>
                      <span className={`ml-auto shrink-0 text-[11px] px-2 py-0.5 rounded-full font-medium ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </div>

                    {/* Title + body */}
                    <p className="font-medium text-white text-[15px] mt-0.5">{promo.title}</p>
                    {promo.body && (
                      <p className="text-white/60 text-[15px] mt-0.5 leading-snug line-clamp-3">{promo.body}</p>
                    )}

                    {/* Price + expiry */}
                    <div className="flex items-center gap-4 mt-2">
                      {promo.price && (
                        <span className="font-display text-[#e63946] text-xl">
                          ${(promo.price / 100).toFixed(0)}
                        </span>
                      )}
                      {promo.expires_at && (
                        <span className="text-xs text-white/30">
                          Expires {format(new Date(promo.expires_at), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>

                    {/* Book CTA — link to artist profile */}
                    <div className="mt-3">
                      <Link
                        href={`/artist/${artist?.username}`}
                        className="inline-flex items-center gap-1.5 text-xs text-[#e63946] hover:underline"
                      >
                        View &amp; Book <ArrowRight size={11} />
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
