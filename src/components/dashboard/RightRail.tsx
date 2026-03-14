'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Search, Calendar, Bookmark, Star, Users, ToggleLeft, ToggleRight, Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import type { Profile } from '@/types'
import { useAuthStore } from '@/lib/stores/auth'
import { getPortfolioImageUrl } from '@/features/portfolio'

interface RightRailProps {
  profile: Profile
}

// ── Artist Right Rail ────────────────────────────────────────────────────────

function ArtistRail({ profile }: { profile: Profile }) {
  const { setProfile } = useAuthStore()
  const supabase = createClient()
  const [toggling, setToggling] = useState(false)

  // Stats
  const { data: stats } = useQuery({
    queryKey: ['right-rail-artist-stats', profile.id],
    queryFn: async () => {
      const [bookingsRes, reviewsRes, portfolioRes, followersRes] = await Promise.all([
        supabase.from('bookings').select('id, status').eq('artist_id', profile.id),
        supabase.from('reviews').select('rating').eq('artist_id', profile.id),
        supabase.from('portfolio_images').select('id').eq('artist_id', profile.id),
        supabase.from('follows').select('id').eq('following_id', profile.id),
      ])
      const reviews = reviewsRes.data ?? []
      const avgRating = reviews.length
        ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length)
        : 0
      return {
        total: bookingsRes.data?.length ?? 0,
        pending: bookingsRes.data?.filter(b => b.status === 'pending').length ?? 0,
        avgRating: avgRating.toFixed(1),
        reviewCount: reviews.length,
        portfolioCount: portfolioRes.data?.length ?? 0,
        followers: followersRes.data?.length ?? 0,
      }
    },
    staleTime: 30_000,
  })

  // Portfolio preview (first 4)
  const { data: portfolioImages = [] } = useQuery({
    queryKey: ['right-rail-portfolio-preview', profile.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('portfolio_images')
        .select('id, storage_path')
        .eq('artist_id', profile.id)
        .order('display_order', { ascending: true })
        .limit(4)
      return data ?? []
    },
    staleTime: 60_000,
  })

  const handleToggleBookings = async () => {
    setToggling(true)
    const newVal = !profile.accepting_bookings
    const { data } = await supabase
      .from('profiles')
      .update({ accepting_bookings: newVal })
      .eq('id', profile.id)
      .select()
      .single()
    if (data) setProfile(data as any)
    setToggling(false)
  }

  return (
    <div className="space-y-1">

      {/* Profile card */}
      <div className="rounded-2xl bg-[#18181c] border border-white/[0.06] p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/profile" className="w-12 h-12 rounded-full bg-[#e63946]/20 flex items-center justify-center text-[#e63946] font-display text-2xl shrink-0 overflow-hidden hover:opacity-80 transition-opacity">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              : profile.display_name[0].toUpperCase()
            }
          </Link>
          <div className="min-w-0">
            <Link href="/dashboard/profile" className="text-sm font-semibold text-white hover:underline truncate block">
              {profile.display_name}
            </Link>
            <p className="text-xs text-white/40">@{profile.username} · Artist</p>
          </div>
        </div>
        <Link
          href={`/artist/${profile.username}`}
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-full border border-white/10 text-xs text-white/50 hover:text-white hover:border-white/30 transition-all"
        >
          <ExternalLink size={11} />
          View Public Profile
        </Link>
      </div>

      {/* Stats */}
      <div className="rounded-2xl bg-[#18181c] border border-white/[0.06] p-4">
        <p className="text-[11px] text-white/30 uppercase tracking-[0.18em] mb-3 font-medium">At a Glance</p>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5">
            <Calendar size={14} className="text-blue-400 shrink-0" />
            <span className="text-white/50 text-sm flex-1">Total Bookings</span>
            <span className="font-semibold text-white text-sm">{stats?.total ?? '—'}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
            </div>
            <span className="text-white/50 text-sm flex-1">Pending</span>
            <span className={`font-semibold text-sm ${(stats?.pending ?? 0) > 0 ? 'text-amber-400' : 'text-white'}`}>
              {stats?.pending ?? '—'}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Star size={14} className="text-[#f5c518] shrink-0" />
            <span className="text-white/50 text-sm flex-1">Avg Rating</span>
            <span className={`font-semibold text-sm ${stats?.reviewCount ? 'text-[#f5c518]' : 'text-white'}`}>
              {stats?.reviewCount ? stats.avgRating : '—'}
              {stats?.reviewCount ? <span className="text-white/30 text-xs ml-1">({stats.reviewCount})</span> : null}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Users size={14} className="text-purple-400 shrink-0" />
            <span className="text-white/50 text-sm flex-1">Followers</span>
            <span className="font-semibold text-white text-sm">{stats?.followers ?? '—'}</span>
          </div>
        </div>
      </div>

      {/* Accepting bookings toggle */}
      <div className="rounded-2xl bg-[#18181c] border border-white/[0.06] p-4">
        <p className="text-[11px] text-white/30 uppercase tracking-[0.18em] mb-3 font-medium">Availability</p>
        <button
          onClick={handleToggleBookings}
          disabled={toggling}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
            profile.accepting_bookings
              ? 'bg-emerald-400/10 border-emerald-400/20 hover:bg-emerald-400/15'
              : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {/* Pulse dot */}
            {profile.accepting_bookings && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </span>
            )}
            {!profile.accepting_bookings && (
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            )}
            <span className={`text-sm font-medium ${profile.accepting_bookings ? 'text-emerald-400' : 'text-white/40'}`}>
              {profile.accepting_bookings ? 'Accepting Bookings' : 'Bookings Closed'}
            </span>
          </div>
          {toggling
            ? <Loader2 size={16} className="animate-spin text-white/30" />
            : profile.accepting_bookings
              ? <ToggleRight size={20} className="text-emerald-400" />
              : <ToggleLeft size={20} className="text-white/30" />
          }
        </button>
      </div>

      {/* Portfolio preview */}
      {(portfolioImages.length > 0 || (stats?.portfolioCount ?? 0) === 0) && (
        <div className="rounded-2xl bg-[#18181c] border border-white/[0.06] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-white/30 uppercase tracking-[0.18em] font-medium">Portfolio</p>
            <Link href="/dashboard/portfolio" className="text-[11px] text-[#e63946] hover:underline">
              Manage →
            </Link>
          </div>
          {portfolioImages.length === 0 ? (
            <Link
              href="/dashboard/portfolio"
              className="flex items-center justify-center py-6 border border-dashed border-white/10 rounded-xl text-xs text-white/30 hover:text-white/50 hover:border-white/20 transition-all"
            >
              + Add your first photo
            </Link>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {portfolioImages.map((img) => (
                <Link key={img.id} href="/dashboard/portfolio">
                  <div className="aspect-square rounded-lg overflow-hidden bg-[#1f1f24] hover:opacity-80 transition-opacity">
                    <img
                      src={getPortfolioImageUrl(img.storage_path)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Link>
              ))}
              {portfolioImages.length < 4 && stats && stats.portfolioCount > portfolioImages.length && (
                <Link href="/dashboard/portfolio" className="aspect-square rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-xs text-white/30 hover:text-white/50 transition-colors">
                  +{stats.portfolioCount - portfolioImages.length}
                </Link>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  )
}

// ── Client Right Rail ────────────────────────────────────────────────────────

function ClientRail({ profile }: { profile: Profile }) {
  const supabase = createClient()

  const { data: summary } = useQuery({
    queryKey: ['right-rail-client-summary', profile.id],
    queryFn: async () => {
      const [bookingsRes, savedRes] = await Promise.all([
        supabase.from('bookings').select('id').eq('client_id', profile.id).in('status', ['pending', 'confirmed']),
        supabase.from('saved_artists').select('id').eq('client_id', profile.id),
      ])
      return {
        activeBookings: bookingsRes.data?.length ?? 0,
        savedArtists: savedRes.data?.length ?? 0,
      }
    },
    staleTime: 30_000,
  })

  return (
    <div className="space-y-1">

      {/* Profile card */}
      <div className="rounded-2xl bg-[#18181c] border border-white/[0.06] p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/profile" className="w-12 h-12 rounded-full bg-[#e63946]/20 flex items-center justify-center text-[#e63946] font-display text-2xl shrink-0 overflow-hidden hover:opacity-80 transition-opacity">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              : profile.display_name[0].toUpperCase()
            }
          </Link>
          <div className="min-w-0">
            <Link href="/dashboard/profile" className="text-sm font-semibold text-white hover:underline truncate block">
              {profile.display_name}
            </Link>
            <p className="text-xs text-white/40">@{profile.username} · Client</p>
          </div>
        </div>
      </div>

      {/* Find artists CTA */}
      <div className="rounded-2xl bg-gradient-to-br from-[#e63946]/10 to-transparent border border-[#e63946]/15 p-4">
        <p className="text-[11px] text-white/30 uppercase tracking-[0.18em] mb-2 font-medium">Ready for new ink?</p>
        <p className="text-white/60 text-sm mb-3 leading-relaxed">Find artists near you specializing in your style.</p>
        <Link
          href="/search"
          className="flex items-center justify-center gap-2 py-2.5 rounded-full bg-[#e63946] hover:bg-[#d42f3b] text-white text-sm font-medium transition-colors"
        >
          <Search size={14} />
          Find Artists
        </Link>
      </div>

      {/* Quick stats */}
      <div className="rounded-2xl bg-[#18181c] border border-white/[0.06] p-4">
        <p className="text-[11px] text-white/30 uppercase tracking-[0.18em] mb-3 font-medium">Your Activity</p>
        <div className="space-y-2.5">
          <Link href="/dashboard/bookings" className="flex items-center gap-2.5 group">
            <Calendar size={14} className="text-blue-400 shrink-0" />
            <span className="text-white/50 text-sm flex-1 group-hover:text-white transition-colors">Active Bookings</span>
            <span className={`font-semibold text-sm ${(summary?.activeBookings ?? 0) > 0 ? 'text-amber-400' : 'text-white'}`}>
              {summary?.activeBookings ?? '—'}
            </span>
          </Link>
          <Link href="/dashboard/saved" className="flex items-center gap-2.5 group">
            <Bookmark size={14} className="text-amber-400 shrink-0" />
            <span className="text-white/50 text-sm flex-1 group-hover:text-white transition-colors">Saved Artists</span>
            <span className="font-semibold text-white text-sm">{summary?.savedArtists ?? '—'}</span>
          </Link>
        </div>
      </div>

    </div>
  )
}

// ── Main export ──────────────────────────────────────────────────────────────

export function RightRail({ profile }: RightRailProps) {
  if (profile.role === 'artist') return <ArtistRail profile={profile} />
  return <ClientRail profile={profile} />
}
