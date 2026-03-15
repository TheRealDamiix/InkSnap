'use client'

import Link from 'next/link'
import { MapPin, Phone, Globe, Instagram, Calendar, CheckCircle } from 'lucide-react'
import { NavLogo } from '@/components/ui/NavLogo'
import { useAuthStore } from '@/lib/stores/auth'
import { TATTOO_STYLES } from '@/lib/constants'
import { getPublicUrl, BUCKETS } from '@/lib/storage'
import type { StudioWithArtists } from '@/types'

interface Props {
  studio: StudioWithArtists
}

export function StudioProfileClient({ studio }: Props) {
  const { profile } = useAuthStore()

  // Aggregate all styles across affiliated artists (deduplicated)
  const allStyles = Array.from(
    new Set(studio.artists.flatMap(a => a.tattoo_styles ?? []))
  )

  const isOwner = profile?.id === studio.owner_id

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-md">
        <a href="/dashboard"><NavLogo /></a>
        <div className="flex items-center gap-3">
          {profile ? (
            <a href="/dashboard" className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors">
              <div className="w-7 h-7 rounded-full bg-[#e63946]/20 flex items-center justify-center text-[#e63946] font-display text-sm overflow-hidden">
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  : profile.display_name[0].toUpperCase()
                }
              </div>
              {profile.display_name}
            </a>
          ) : (
            <a href="/auth/login" className="text-sm text-[#e63946]">Sign in</a>
          )}
        </div>
      </nav>

      <div className="pt-16">
        {/* Hero banner */}
        <div className="relative h-48 bg-gradient-to-br from-[#e63946]/15 via-[#18181c] to-[#111114] overflow-hidden">
          {studio.avatar_url && (
            <img
              src={studio.avatar_url}
              alt={studio.name}
              className="absolute inset-0 w-full h-full object-cover opacity-20"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/50 to-transparent" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Studio header */}
          <div className="flex flex-wrap items-end justify-between gap-4 -mt-10 mb-6 relative z-10">
            <div className="flex items-end gap-4">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-2xl bg-[#e63946]/20 border-4 border-[#0a0a0b] flex items-center justify-center text-[#e63946] font-display text-3xl flex-shrink-0 overflow-hidden">
                {studio.avatar_url ? (
                  <img src={studio.avatar_url} alt={studio.name} className="w-full h-full object-cover" />
                ) : (
                  studio.name[0]?.toUpperCase()
                )}
              </div>
              <div className="pb-1">
                <h1 className="font-display text-3xl text-white tracking-wide">{studio.name.toUpperCase()}</h1>
                <div className="flex items-center gap-1 text-white/40 text-sm mt-0.5">
                  <MapPin size={12} />
                  {[studio.address, studio.city, studio.state].filter(Boolean).join(', ')}
                </div>
              </div>
            </div>

            {/* Owner action */}
            {isOwner && (
              <Link
                href="/dashboard/studio"
                className="px-4 py-2 text-sm border border-white/10 rounded-lg text-white/60 hover:text-white hover:border-white/30 transition-all"
              >
                Manage Studio
              </Link>
            )}
          </div>

          {/* Contact links */}
          <div className="flex flex-wrap items-center gap-4 mb-5 text-sm text-white/40">
            {studio.phone && (
              <a href={`tel:${studio.phone}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Phone size={13} />{studio.phone}
              </a>
            )}
            {studio.website && (
              <a href={studio.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Globe size={13} />Website
              </a>
            )}
            {studio.instagram && (
              <a
                href={`https://instagram.com/${studio.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-white transition-colors"
              >
                <Instagram size={13} />{studio.instagram}
              </a>
            )}
          </div>

          {/* Style tags (aggregated from all artists) */}
          {allStyles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {allStyles.slice(0, 10).map(slug => {
                const style = TATTOO_STYLES.find(s => s.slug === slug)
                return (
                  <span key={slug} className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/50">
                    {style?.label ?? slug}
                  </span>
                )
              })}
            </div>
          )}

          {/* Section header */}
          <div className="mb-5">
            <div className="ink-accent-line mb-3" />
            <h2 className="font-display text-3xl text-white tracking-wide">
              ARTISTS{' '}
              <span className="text-[#e63946]">{studio.artists.length > 0 ? `(${studio.artists.length})` : ''}</span>
            </h2>
          </div>

          {/* Artists grid */}
          {studio.artists.length === 0 ? (
            <div className="text-center py-16 text-white/20 text-sm">
              No artists affiliated yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-16">
              {studio.artists.map(artist => {
                const coverPath = artist.portfolio_cover
                const coverUrl = coverPath ? getPublicUrl(BUCKETS.PORTFOLIO, coverPath) : null

                return (
                  <Link
                    key={artist.id}
                    href={`/artist/${artist.username}`}
                    className="ink-card overflow-hidden group hover:scale-[1.02] transition-transform"
                  >
                    {/* Cover */}
                    <div className="relative aspect-square bg-[#1f1f24] overflow-hidden">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={artist.display_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/10 font-display text-5xl">
                          {artist.display_name[0]}
                        </div>
                      )}
                      <div className="absolute inset-0 ink-image-overlay opacity-60" />

                      {/* Badges */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {artist.is_primary && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#e63946]/90 text-white font-medium">
                            Resident
                          </span>
                        )}
                      </div>
                      {artist.accepting_bookings && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <div className="font-medium text-sm text-white truncate">{artist.display_name}</div>
                      {artist.city && (
                        <div className="flex items-center gap-1 text-xs text-white/40 mt-0.5">
                          <MapPin size={10} />
                          {artist.city}{artist.state ? `, ${artist.state}` : ''}
                        </div>
                      )}
                      {(artist.tattoo_styles ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {artist.tattoo_styles.slice(0, 2).map((slug: string) => {
                            const style = TATTOO_STYLES.find(s => s.slug === slug)
                            return (
                              <span key={slug} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                                {style?.label ?? slug}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
