'use client'

import { useAuthStore } from '@/lib/stores/auth'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Search, Bookmark, Calendar, Zap } from 'lucide-react'
import Link from 'next/link'
import type { Promotion, Booking } from '@/types'
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '@/lib/constants'
import { formatDistanceToNow, format } from 'date-fns'

export function ClientFeed() {
  const { profile } = useAuthStore()
  const supabase = createClient()

  const { data: feed } = useQuery({
    queryKey: ['client-feed', profile?.id],
    queryFn: async () => {
      // Get followed artists
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

      return data as Promotion[]
    },
    enabled: !!profile?.id,
  })

  const { data: activeBookings } = useQuery({
    queryKey: ['client-bookings', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*, artist:profiles!bookings_artist_id_fkey(display_name, username, avatar_url)')
        .eq('client_id', profile!.id)
        .in('status', ['pending', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(3)
      return data as Booking[]
    },
    enabled: !!profile?.id,
  })

  if (!profile) return null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-white tracking-wide">
          HEY, {profile.display_name.toUpperCase().split(' ')[0]}
        </h1>
        <p className="text-white/40 mt-1">Your tattoo journey starts here</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Link href="/search" className="ink-card p-5 flex items-center gap-3 hover:scale-[1.02] transition-transform bg-gradient-to-br from-[#e63946]/10 to-transparent">
          <Search size={20} className="text-[#e63946]" />
          <div>
            <div className="text-sm font-medium text-white">Find Artists</div>
            <div className="text-xs text-white/40">Discover near you</div>
          </div>
        </Link>
        <Link href="/dashboard/bookings" className="ink-card p-5 flex items-center gap-3 hover:scale-[1.02] transition-transform">
          <Calendar size={20} className="text-blue-400" />
          <div>
            <div className="text-sm font-medium text-white">My Bookings</div>
            <div className="text-xs text-white/40">{activeBookings?.length ?? 0} active</div>
          </div>
        </Link>
        <Link href="/dashboard/saved" className="ink-card p-5 flex items-center gap-3 hover:scale-[1.02] transition-transform">
          <Bookmark size={20} className="text-amber-400" />
          <div>
            <div className="text-sm font-medium text-white">Saved Artists</div>
            <div className="text-xs text-white/40">Your bookmarks</div>
          </div>
        </Link>
      </div>

      {/* Active bookings */}
      {activeBookings && activeBookings.length > 0 && (
        <div>
          <h2 className="font-display text-xl text-white tracking-wide mb-4">ACTIVE BOOKINGS</h2>
          <div className="space-y-3">
            {activeBookings.map((booking) => (
              <Link key={booking.id} href={`/dashboard/bookings/${booking.id}`} className="ink-card p-4 flex items-center gap-4 hover:scale-[1.01] transition-transform">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 font-display text-lg flex-shrink-0">
                  {(booking.artist as any)?.display_name?.[0]}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="text-sm font-medium text-white truncate">{(booking.artist as any)?.display_name}</div>
                  <div className="text-xs text-white/40 truncate">{booking.description}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${BOOKING_STATUS_COLORS[booking.status]}`}>
                  {BOOKING_STATUS_LABELS[booking.status]}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Feed */}
      <div>
        <h2 className="font-display text-xl text-white tracking-wide mb-4">FOLLOWING FEED</h2>
        {(!feed || feed.length === 0) ? (
          <div className="ink-card p-12 text-center">
            <Zap size={32} className="text-white/20 mx-auto mb-4" />
            <p className="text-white/30 text-sm mb-4">Follow artists to see their flash deals and updates here</p>
            <Link href="/search" className="text-sm text-[#e63946] hover:text-[#ff5a65] transition-colors">
              Explore artists →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {feed.map((promo) => (
              <div key={promo.id} className="ink-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-full bg-[#e63946]/20 flex items-center justify-center text-[#e63946] font-display text-lg">
                    {(promo.artist as any)?.display_name?.[0]}
                  </div>
                  <div>
                    <Link href={`/artist/${(promo.artist as any)?.username}`} className="text-sm font-medium text-white hover:text-[#e63946] transition-colors">
                      {(promo.artist as any)?.display_name}
                    </Link>
                    <div className="text-xs text-white/30">
                      {formatDistanceToNow(new Date(promo.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="ml-auto">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      promo.type === 'flash_deal' ? 'bg-[#e63946]/10 text-[#e63946]' :
                      promo.type === 'convention' ? 'bg-purple-400/10 text-purple-400' :
                      'bg-white/5 text-white/40'
                    }`}>
                      {promo.type === 'flash_deal' ? '⚡ Flash Deal' : promo.type === 'convention' ? '📍 Convention' : '📢 Update'}
                    </span>
                  </div>
                </div>
                <h3 className="font-medium text-white mb-2">{promo.title}</h3>
                {promo.body && <p className="text-sm text-white/50 leading-relaxed">{promo.body}</p>}
                {promo.price && (
                  <div className="mt-3 text-[#e63946] font-display text-2xl">${(promo.price / 100).toFixed(0)}</div>
                )}
                {promo.expires_at && (
                  <div className="mt-2 text-xs text-white/30">
                    Expires {format(new Date(promo.expires_at), 'MMM d, yyyy')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
