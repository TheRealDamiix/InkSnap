'use client'

import { useAuthStore } from '@/lib/stores/auth'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Eye, Star, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import type { Booking } from '@/features/bookings'
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '@/lib/constants'
import { formatDistanceToNow } from 'date-fns'
import { useState } from 'react'

export function ArtistOverview() {
  const { profile, setProfile } = useAuthStore()
  const [togglingBookings, setTogglingBookings] = useState(false)
  const supabase = createClient()

  const { data: stats } = useQuery({
    queryKey: ['artist-stats', profile?.id],
    queryFn: async () => {
      const [bookingsRes, reviewsRes, portfolioRes, followersRes] = await Promise.all([
        supabase.from('bookings').select('id, status').eq('artist_id', profile!.id),
        supabase.from('reviews').select('rating').eq('artist_id', profile!.id),
        supabase.from('portfolio_images').select('id').eq('artist_id', profile!.id),
        supabase.from('follows').select('id').eq('following_id', profile!.id),
      ])
      const reviews = reviewsRes.data ?? []
      const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0
      return {
        totalBookings: bookingsRes.data?.length ?? 0,
        pendingBookings: bookingsRes.data?.filter(b => b.status === 'pending').length ?? 0,
        avgRating: avgRating.toFixed(1),
        reviewCount: reviews.length,
        portfolioCount: portfolioRes.data?.length ?? 0,
        followerCount: followersRes.data?.length ?? 0,
      }
    },
    enabled: !!profile?.id,
  })

  const { data: recentBookings } = useQuery({
    queryKey: ['artist-recent-bookings', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*, client:profiles!bookings_client_id_fkey(display_name, username, avatar_url)')
        .eq('artist_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(5)
      return data as Booking[]
    },
    enabled: !!profile?.id,
  })

  const toggleBookings = async () => {
    if (!profile) return
    setTogglingBookings(true)
    const newVal = !profile.accepting_bookings
    const { data } = await supabase
      .from('profiles')
      .update({ accepting_bookings: newVal })
      .eq('id', profile.id)
      .select()
      .single()
    if (data) setProfile(data)
    setTogglingBookings(false)
  }

  if (!profile) return null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-white tracking-wide">
            HEY, {profile.display_name.toUpperCase().split(' ')[0]}
          </h1>
          <p className="text-white/40 mt-1">Here's what's happening with your profile</p>
        </div>
        {/* Accepting bookings toggle */}
        <button
          onClick={toggleBookings}
          disabled={togglingBookings}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full border text-sm font-medium transition-all ${
            profile.accepting_bookings
              ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/20'
              : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
          }`}
        >
          {togglingBookings ? (
            <Loader2 size={16} className="animate-spin" />
          ) : profile.accepting_bookings ? (
            <ToggleRight size={18} />
          ) : (
            <ToggleLeft size={18} />
          )}
          {profile.accepting_bookings ? 'Accepting Bookings' : 'Bookings Closed'}
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Bookings', value: stats?.totalBookings ?? '—', icon: <Calendar size={18} />, color: 'text-blue-400' },
          { label: 'Pending', value: stats?.pendingBookings ?? '—', icon: <Eye size={18} />, color: 'text-amber-400' },
          { label: 'Avg Rating', value: stats?.avgRating ?? '—', icon: <Star size={18} />, color: 'text-[#e63946]' },
          { label: 'Followers', value: stats?.followerCount ?? '—', icon: <Eye size={18} />, color: 'text-purple-400' },
        ].map((s) => (
          <div key={s.label} className="ink-card p-5">
            <div className={`mb-3 ${s.color}`}>{s.icon}</div>
            <div className="font-display text-3xl text-white mb-1">{s.value}</div>
            <div className="text-xs text-white/40 uppercase tracking-widest">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { href: '/dashboard/portfolio', label: 'Manage Portfolio', count: stats?.portfolioCount, color: 'from-purple-500/10' },
          { href: '/dashboard/bookings', label: 'View Bookings', count: stats?.pendingBookings ? `${stats.pendingBookings} pending` : undefined, color: 'from-blue-500/10' },
          { href: '/dashboard/promotions', label: 'Post Promotion', color: 'from-[#e63946]/10' },
        ].map((link) => (
          <Link key={link.href} href={link.href} className={`ink-card p-5 bg-gradient-to-br ${link.color} to-transparent hover:scale-[1.02] transition-transform`}>
            <div className="text-sm font-medium text-white mb-1">{link.label}</div>
            {link.count !== undefined && <div className="text-xs text-white/40">{link.count}</div>}
          </Link>
        ))}
      </div>

      {/* Recent bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-white tracking-wide">RECENT REQUESTS</h2>
          <Link href="/dashboard/bookings" className="text-xs text-white/40 hover:text-[#e63946] transition-colors">View all →</Link>
        </div>
        {recentBookings?.length === 0 && (
          <div className="ink-card p-8 text-center text-white/30 text-sm">
            No booking requests yet. Share your profile to get started.
          </div>
        )}
        <div className="space-y-3">
          {recentBookings?.map((booking) => (
            <Link key={booking.id} href={`/dashboard/bookings/${booking.id}`} className="ink-card p-4 flex items-center gap-4 hover:scale-[1.01] transition-transform">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 font-display text-lg flex-shrink-0">
                {(booking.client as any)?.display_name?.[0] ?? '?'}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="text-sm font-medium text-white truncate">{(booking.client as any)?.display_name}</div>
                <div className="text-xs text-white/40 truncate">{booking.description}</div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BOOKING_STATUS_COLORS[booking.status]}`}>
                  {BOOKING_STATUS_LABELS[booking.status]}
                </span>
                <span className="text-xs text-white/30">
                  {formatDistanceToNow(new Date(booking.created_at), { addSuffix: true })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
