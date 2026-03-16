'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Calendar, Users } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { ConventionSearchResult } from '../conventions.types'

interface Props {
  convention: ConventionSearchResult
}

export function ConventionCard({ convention }: Props) {
  const startLabel = format(parseISO(convention.start_date), 'MMM d')
  const endLabel   = format(parseISO(convention.end_date),   'MMM d, yyyy')

  return (
    <Link
      href={`/convention/${convention.id}`}
      className="ink-card overflow-hidden group hover:scale-[1.02] transition-transform flex flex-col"
    >
      {/* Cover / hero */}
      <div className="relative h-32 bg-gradient-to-br from-purple-900/30 via-[#18181c] to-[#111114] flex items-center justify-center overflow-hidden">
        {convention.cover_url && (
          <Image
            src={convention.cover_url}
            alt={convention.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
          />
        )}
        <div className="absolute inset-0 ink-image-overlay opacity-40" />

        {/* Artist count badge */}
        {convention.artist_count > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm border border-white/10 rounded-full px-2 py-0.5">
            <Users size={10} className="text-white/50" />
            <span className="text-[10px] text-white/70">{convention.artist_count}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <div className="font-semibold text-sm text-white truncate">{convention.name}</div>
          <div className="flex items-center gap-1 text-xs text-purple-400/70 mt-0.5">
            <Calendar size={10} />
            {startLabel} – {endLabel}
          </div>
          {(convention.city || convention.venue) && (
            <div className="flex items-center gap-1 text-xs text-white/40 mt-0.5">
              <MapPin size={10} />
              {[convention.venue, convention.city].filter(Boolean).join(', ')}
            </div>
          )}
        </div>

        {/* Artist preview avatars */}
        {convention.artist_previews.length > 0 && (
          <div className="flex items-center gap-1 mt-auto pt-1">
            {convention.artist_previews.map((a) => (
              <div
                key={a.id}
                className="w-6 h-6 rounded-full bg-purple-900/40 border border-[#0a0a0b] flex items-center justify-center text-purple-300 text-[10px] font-display overflow-hidden -ml-1 first:ml-0"
              >
                {a.avatar_url ? (
                  <Image src={a.avatar_url} alt={a.display_name} width={24} height={24} className="w-full h-full object-cover" />
                ) : (
                  a.display_name[0]?.toUpperCase()
                )}
              </div>
            ))}
            {convention.artist_count > 4 && (
              <span className="text-[10px] text-white/30 ml-1">+{convention.artist_count - 4}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
