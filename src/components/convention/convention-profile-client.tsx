'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import {
  MapPin, Calendar, Globe, Instagram, Users, UserCheck,
  Bell, BellOff, CheckCircle2
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useAuthStore } from '@/lib/stores/auth'
import { useConventionFollow, useJoinConvention, useConventionPosts } from '@/features/conventions'
import { FeedCard } from '@/features/feed'
import type { Convention, FeedPost } from '@/types'
import type { StudioArtist } from '@/types'
import { getPublicUrl, BUCKETS } from '@/lib/storage'

interface Organizer {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
}

interface Props {
  convention: Convention
  organizer: Organizer | null
  artists: StudioArtist[]
}

export function ConventionProfileClient({ convention, organizer, artists }: Props) {
  const { profile } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'artists' | 'posts'>('artists')

  const { isFollowing, toggle: toggleFollow, isPending: followPending } =
    useConventionFollow(convention.id, profile?.id)

  const { mutate: joinConvention, isPending: joiningConvention } = useJoinConvention()

  const { data: posts } = useConventionPosts(convention.id)

  const startLabel = format(parseISO(convention.start_date), 'MMM d')
  const endLabel   = format(parseISO(convention.end_date),   'MMM d, yyyy')

  const isAttending = false // could check artist_conventions here if needed

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0b]">
      {/* Hero */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-purple-900/40 via-[#18181c] to-[#0a0a0b] overflow-hidden">
        {convention.cover_url && (
          <Image
            src={convention.cover_url}
            alt={convention.name}
            fill
            className="object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-transparent to-transparent" />

        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white leading-tight">
              {convention.name}
            </h1>
            <div className="flex items-center gap-1 text-sm text-purple-400 mt-1">
              <Calendar size={13} />
              {startLabel} – {endLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6">

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Location */}
          {(convention.city || convention.venue) && (
            <div className="flex items-center gap-1 text-sm text-white/50">
              <MapPin size={13} className="text-white/30" />
              {[convention.venue, convention.city].filter(Boolean).join(', ')}
            </div>
          )}

          {/* Organizer */}
          {organizer && (
            <Link
              href={`/artist/${organizer.username}`}
              className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-[#e63946]/20 overflow-hidden border border-white/10 flex items-center justify-center text-[10px] text-[#e63946]">
                {organizer.avatar_url ? (
                  <Image src={organizer.avatar_url} alt={organizer.display_name} width={24} height={24} className="object-cover" />
                ) : (
                  organizer.display_name[0]?.toUpperCase()
                )}
              </div>
              <span>Organized by <strong className="text-white/70">{organizer.display_name}</strong></span>
            </Link>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Follow button */}
            <button
              onClick={() => toggleFollow()}
              disabled={followPending || !profile}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isFollowing
                  ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
              }`}
            >
              {isFollowing ? <BellOff size={12} /> : <Bell size={12} />}
              {isFollowing ? 'Following' : 'Follow'}
            </button>

            {/* Artist RSVP button */}
            {profile?.role === 'artist' && (
              <button
                onClick={() => joinConvention({ conventionId: convention.id })}
                disabled={joiningConvention || isAttending}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isAttending
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-[#e63946]/20 text-[#e63946] hover:bg-[#e63946]/30'
                }`}
              >
                {isAttending ? <CheckCircle2 size={12} /> : <UserCheck size={12} />}
                {isAttending ? 'Attending' : 'RSVP'}
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        {convention.description && (
          <p className="text-sm text-white/50 leading-relaxed">{convention.description}</p>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-white/5">
          {(['artists', 'posts'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'text-white border-[#e63946]'
                  : 'text-white/30 border-transparent hover:text-white/60'
              }`}
            >
              {tab === 'artists' ? `Artists (${artists.length})` : `Posts (${posts?.length ?? 0})`}
            </button>
          ))}
        </div>

        {/* Artists grid */}
        {activeTab === 'artists' && (
          <>
            {artists.length === 0 ? (
              <p className="text-sm text-white/30 text-center py-8">No confirmed artists yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {artists.map(artist => (
                  <ArtistMiniCard key={artist.id} artist={artist} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Posts tab */}
        {activeTab === 'posts' && (
          <>
            {(!posts || posts.length === 0) ? (
              <p className="text-sm text-white/30 text-center py-8">No posts yet.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {posts.map((p: any) => (
                  <FeedCard
                    key={p.id}
                    post={{
                      ...p,
                      author_kind: 'convention',
                      author_id: convention.id,
                      author_name: convention.name,
                      author_avatar: convention.cover_url,
                      author_slug: convention.id,
                    } as FeedPost}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Mini artist card ──────────────────────────────────────────────────────────

function ArtistMiniCard({ artist }: { artist: StudioArtist & { portfolio_cover?: string | null } }) {
  const coverUrl = artist.portfolio_cover
    ? getPublicUrl(BUCKETS.PORTFOLIO, artist.portfolio_cover)
    : null

  return (
    <Link
      href={`/artist/${artist.username}`}
      className="ink-card overflow-hidden group hover:scale-[1.02] transition-transform"
    >
      <div className="relative h-24 bg-gradient-to-br from-[#e63946]/10 via-[#18181c] to-[#111114] overflow-hidden">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={artist.display_name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-70"
          />
        ) : artist.avatar_url ? (
          <Image
            src={artist.avatar_url}
            alt={artist.display_name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-70"
          />
        ) : null}
        <div className="absolute inset-0 ink-image-overlay opacity-50" />
      </div>
      <div className="p-2">
        <div className="text-xs font-semibold text-white truncate">{artist.display_name}</div>
        {(artist.city || artist.state) && (
          <div className="flex items-center gap-0.5 text-[10px] text-white/30 mt-0.5">
            <MapPin size={8} />
            {[artist.city, artist.state].filter(Boolean).join(', ')}
          </div>
        )}
      </div>
    </Link>
  )
}
