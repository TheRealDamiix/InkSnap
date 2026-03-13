'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  MapPin, Star, Instagram, Globe, Calendar, Heart,
  Bookmark, MessageSquare, CheckCircle, XCircle
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ArtistProfile } from '@/types'
import { TATTOO_STYLES } from '@/lib/constants'
import { BookingModal } from '@/components/booking/booking-modal'
import { getPublicUrl, BUCKETS } from '@/lib/storage'
import Image from 'next/image'

interface Props {
  artist: ArtistProfile & {
    portfolio_images: any[]
    reviews: any[]
    artist_studios: any[]
  }
}

export function ArtistProfileClient({ artist }: Props) {
  const { profile } = useAuthStore()
  const [bookingOpen, setBookingOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'portfolio' | 'reviews'>('portfolio')
  const supabase = createClient()
  const router = useRouter()
  const qc = useQueryClient()

  const avgRating = artist.reviews.length
    ? (artist.reviews.reduce((s: number, r: any) => s + r.rating, 0) / artist.reviews.length).toFixed(1)
    : null

  const { data: isFollowing } = useQuery({
    queryKey: ['is-following', profile?.id, artist.id],
    queryFn: async () => {
      if (!profile) return false
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', profile.id)
        .eq('following_id', artist.id)
        .maybeSingle()
      return !!data
    },
    enabled: !!profile,
  })

  const { data: isSaved } = useQuery({
    queryKey: ['is-saved', profile?.id, artist.id],
    queryFn: async () => {
      if (!profile) return false
      const { data } = await supabase
        .from('saved_artists')
        .select('id')
        .eq('client_id', profile.id)
        .eq('artist_id', artist.id)
        .maybeSingle()
      return !!data
    },
    enabled: !!profile && profile.role === 'client',
  })

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (!profile) { router.push('/auth/login'); return }
      if (isFollowing) {
        await supabase.from('follows').delete()
          .eq('follower_id', profile.id).eq('following_id', artist.id)
      } else {
        await supabase.from('follows').insert({ follower_id: profile.id, following_id: artist.id })
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['is-following', profile?.id, artist.id] }),
  })

  const toggleSave = useMutation({
    mutationFn: async () => {
      if (!profile) { router.push('/auth/login'); return }
      if (isSaved) {
        await supabase.from('saved_artists').delete()
          .eq('client_id', profile.id).eq('artist_id', artist.id)
      } else {
        await supabase.from('saved_artists').insert({ client_id: profile.id, artist_id: artist.id })
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['is-saved', profile?.id, artist.id] }),
  })

  const startConversation = async () => {
    if (!profile) { window.location.href = '/auth/login'; return }

    // Find existing conversation via direct queries (cp_select = true)
    const { data: myConvs } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('profile_id', profile.id)

    const myConvIds = myConvs?.map(c => c.conversation_id) ?? []

    if (myConvIds.length > 0) {
      const { data: shared } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('profile_id', artist.id)
        .in('conversation_id', myConvIds)
        .limit(1)
      if (shared?.length) {
        window.location.href = `/messages/${shared[0].conversation_id}`
        return
      }
    }

    // No existing conversation — create one
    const convId = crypto.randomUUID()
    await supabase.from('conversations').insert({ id: convId })
    await supabase.from('conversation_participants').insert([
      { conversation_id: convId, profile_id: profile.id },
      { conversation_id: convId, profile_id: artist.id },
    ])
    window.location.href = `/messages/${convId}`
  }

  const primaryStudio = artist.artist_studios?.find((s: any) => s.is_primary) ?? artist.artist_studios?.[0]
  const portfolioImages = [...artist.portfolio_images].sort((a, b) => a.display_order - b.display_order)

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* Header bar */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-md">
        <a href="/dashboard" className="font-display text-2xl text-white tracking-wider hover:text-[#e63946] transition-colors">INKSNAP</a>
        {profile ? (
          <a href="/dashboard" className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors">
            <div className="w-7 h-7 rounded-full bg-[#e63946]/20 flex items-center justify-center text-[#e63946] font-display text-sm">
              {profile.display_name[0].toUpperCase()}
            </div>
            {profile.display_name}
          </a>
        ) : (
          <a href="/auth/login" className="text-sm text-[#e63946]">Sign in</a>
        )}
      </nav>

      <div className="pt-16">
        {/* Hero / banner */}
        <div className="relative h-56 bg-gradient-to-br from-[#e63946]/20 via-[#18181c] to-[#111114]">
          <div className="absolute inset-0 overflow-hidden">
            {portfolioImages.slice(0, 3).map((img, i) => (
              <div
                key={img.id}
                className="absolute inset-0 opacity-20"
                style={{ zIndex: i }}
              >
                <img
                  src={getPublicUrl(BUCKETS.PORTFOLIO, img.storage_path)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/60 to-transparent" />
          </div>
        </div>

        {/* Profile info */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4 -mt-12 mb-6 relative z-10">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-2xl bg-[#e63946]/20 border-4 border-[#0a0a0b] flex items-center justify-center text-[#e63946] font-display text-4xl flex-shrink-0">
                {artist.avatar_url ? (
                  <img src={artist.avatar_url} alt={artist.display_name} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  artist.display_name[0].toUpperCase()
                )}
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-3xl text-white tracking-wide">{artist.display_name.toUpperCase()}</h1>
                  {artist.accepting_bookings && (
                    <span className="flex items-center gap-1 text-xs bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 px-2 py-0.5 rounded-full">
                      <CheckCircle size={10} /> Open
                    </span>
                  )}
                  {!artist.accepting_bookings && (
                    <span className="flex items-center gap-1 text-xs bg-white/5 text-white/30 border border-white/10 px-2 py-0.5 rounded-full">
                      <XCircle size={10} /> Closed
                    </span>
                  )}
                </div>
                <div className="text-white/40 text-sm">@{artist.username}</div>
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2 pb-1">
              {profile?.role === 'client' && (
                <>
                  <button onClick={() => toggleSave.mutate()} className={`p-2.5 rounded-lg border transition-all ${isSaved ? 'bg-amber-400/10 border-amber-400/30 text-amber-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}>
                    <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
                  </button>
                  <button onClick={() => toggleFollow.mutate()} className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${isFollowing ? 'bg-white/5 border-white/10 text-white/60 hover:text-white' : 'bg-[#e63946]/10 border-[#e63946]/30 text-[#e63946] hover:bg-[#e63946]/20'}`}>
                    <Heart size={14} className="inline mr-1.5" fill={isFollowing ? 'currentColor' : 'none'} />
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                  <button onClick={startConversation} className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all">
                    <MessageSquare size={18} />
                  </button>
                  {artist.accepting_bookings && (
                    <button onClick={() => setBookingOpen(true)} className="px-5 py-2 rounded-lg bg-[#e63946] hover:bg-[#d42f3b] text-white text-sm font-medium transition-all flex items-center gap-1.5">
                      <Calendar size={14} />
                      Book Now
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-5 text-sm text-white/40">
            {artist.city && <span className="flex items-center gap-1"><MapPin size={13} />{artist.city}{artist.state ? `, ${artist.state}` : ''}</span>}
            {avgRating && <span className="flex items-center gap-1"><Star size={13} className="text-[#e63946]" />{avgRating} ({artist.reviews.length} reviews)</span>}
            {artist.years_experience && <span>{artist.years_experience} years experience</span>}
            {artist.instagram && (
              <a href={`https://instagram.com/${artist.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-white transition-colors">
                <Instagram size={13} />{artist.instagram}
              </a>
            )}
            {artist.website && (
              <a href={artist.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-white transition-colors">
                <Globe size={13} />Website
              </a>
            )}
          </div>

          {/* Bio */}
          {artist.bio && <p className="text-white/60 text-sm leading-relaxed mb-5 max-w-2xl">{artist.bio}</p>}

          {/* Styles */}
          {artist.tattoo_styles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {artist.tattoo_styles.map((slug) => {
                const style = TATTOO_STYLES.find(s => s.slug === slug)
                return (
                  <span key={slug} className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60">
                    {style?.label ?? slug}
                  </span>
                )
              })}
            </div>
          )}

          {/* Studio affiliations */}
          {artist.artist_studios.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-3">
              {artist.artist_studios.map((aff: any) => (
                <div key={aff.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60">
                  <MapPin size={11} />
                  {aff.studio?.name}
                  {aff.is_primary && <span className="text-[#e63946]">• Primary</span>}
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-white/10 mb-6 flex gap-6">
            {(['portfolio', 'reviews'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                  activeTab === tab ? 'border-[#e63946] text-white' : 'border-transparent text-white/40 hover:text-white/60'
                }`}
              >
                {tab} {tab === 'portfolio' ? `(${portfolioImages.length})` : `(${artist.reviews.length})`}
              </button>
            ))}
          </div>

          {/* Portfolio grid */}
          {activeTab === 'portfolio' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-12">
              {portfolioImages.map((img) => (
                <div key={img.id} className="portfolio-item aspect-square rounded-xl overflow-hidden bg-white/5">
                  <img
                    src={getPublicUrl(BUCKETS.PORTFOLIO, img.storage_path)}
                    alt={img.caption ?? 'Portfolio image'}
                    className="w-full h-full object-cover"
                  />
                  <div className="overlay flex items-end p-3">
                    {img.caption && <span className="text-xs text-white/80">{img.caption}</span>}
                  </div>
                </div>
              ))}
              {portfolioImages.length === 0 && (
                <div className="col-span-3 text-center py-12 text-white/20 text-sm">No portfolio images yet</div>
              )}
            </div>
          )}

          {/* Reviews */}
          {activeTab === 'reviews' && (
            <div className="space-y-4 pb-12">
              {artist.reviews.map((review: any) => (
                <div key={review.id} className="ink-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 text-sm">
                        {review.client?.display_name?.[0]}
                      </div>
                      <span className="text-sm font-medium text-white">{review.client?.display_name}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} size={14} className={i <= review.rating ? 'text-[#e63946] fill-current' : 'text-white/10 fill-current'} />
                      ))}
                    </div>
                  </div>
                  {review.body && <p className="text-sm text-white/60 leading-relaxed">{review.body}</p>}
                </div>
              ))}
              {artist.reviews.length === 0 && (
                <div className="text-center py-12 text-white/20 text-sm">No reviews yet</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Booking modal */}
      {bookingOpen && (
        <BookingModal artist={artist} onClose={() => setBookingOpen(false)} />
      )}
    </div>
  )
}
