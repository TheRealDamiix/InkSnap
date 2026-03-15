'use client'

import Link from 'next/link'
import { MapPin, Phone, Globe, Instagram, Users } from 'lucide-react'
import type { StudioSearchResult } from '../studios.types'

interface Props {
  studio: StudioSearchResult
}

export function StudioCard({ studio }: Props) {
  const initial = studio.name[0]?.toUpperCase() ?? 'S'

  return (
    <Link
      href={`/studio/${studio.id}`}
      className="ink-card overflow-hidden group hover:scale-[1.02] transition-transform flex flex-col"
    >
      {/* Avatar / cover */}
      <div className="relative h-32 bg-gradient-to-br from-[#e63946]/15 via-[#18181c] to-[#111114] flex items-center justify-center overflow-hidden">
        {studio.avatar_url ? (
          <img
            src={studio.avatar_url}
            alt={studio.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-70"
          />
        ) : (
          <span className="font-display text-6xl text-white/10 select-none">{initial}</span>
        )}
        <div className="absolute inset-0 ink-image-overlay opacity-40" />

        {/* Artist count badge */}
        {studio.artist_count > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm border border-white/10 rounded-full px-2 py-0.5">
            <Users size={10} className="text-white/50" />
            <span className="text-[10px] text-white/70">{studio.artist_count}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <div className="font-semibold text-sm text-white truncate">{studio.name}</div>
          {(studio.city || studio.state) && (
            <div className="flex items-center gap-1 text-xs text-white/40 mt-0.5">
              <MapPin size={10} />
              {[studio.city, studio.state].filter(Boolean).join(', ')}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="flex items-center gap-3 text-white/25">
          {studio.phone && <Phone size={11} />}
          {studio.website && <Globe size={11} />}
          {studio.instagram && <Instagram size={11} />}
        </div>

        {/* Artist preview avatars */}
        {studio.artist_previews.length > 0 && (
          <div className="flex items-center gap-1 mt-auto pt-1">
            {studio.artist_previews.map((a) => (
              <div
                key={a.id}
                className="w-6 h-6 rounded-full bg-[#e63946]/20 border border-[#0a0a0b] flex items-center justify-center text-[#e63946] text-[10px] font-display overflow-hidden -ml-1 first:ml-0"
              >
                {a.avatar_url ? (
                  <img src={a.avatar_url} alt={a.display_name} className="w-full h-full object-cover" />
                ) : (
                  a.display_name[0]?.toUpperCase()
                )}
              </div>
            ))}
            {studio.artist_count > 4 && (
              <span className="text-[10px] text-white/30 ml-1">+{studio.artist_count - 4}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
