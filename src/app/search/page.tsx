'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, MapPin, SlidersHorizontal, X, Star, Map, List } from 'lucide-react'
import { TATTOO_STYLES } from '@/lib/constants'
import Link from 'next/link'
import type { Profile } from '@/types'
import { getPublicUrl, BUCKETS } from '@/lib/storage'

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [city, setCity] = useState(searchParams.get('city') ?? '')
  const [selectedStyles, setSelectedStyles] = useState<string[]>(
    searchParams.get('styles')?.split(',').filter(Boolean) ?? []
  )
  const [artists, setArtists] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')
  const supabase = createClient()

  const search = async () => {
    setLoading(true)
    let q = supabase
      .from('profiles')
      .select(`
        id, username, display_name, avatar_url, bio, city, state,
        tattoo_styles, accepting_bookings, years_experience,
        portfolio_images(id, storage_path, display_order)
      `)
      .eq('role', 'artist')
      .order('accepting_bookings', { ascending: false })

    if (query) {
      q = q.or(`display_name.ilike.%${query}%,username.ilike.%${query}%,bio.ilike.%${query}%`)
    }
    if (city) {
      q = q.ilike('city', `%${city}%`)
    }
    if (selectedStyles.length > 0) {
      q = q.overlaps('tattoo_styles', selectedStyles)
    }

    const { data } = await q.limit(40)
    setArtists(data ?? [])
    setLoading(false)
  }

  useEffect(() => { search() }, [query, city, selectedStyles])

  const toggleStyle = (slug: string) => {
    setSelectedStyles(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-[#0a0a0b]/95 backdrop-blur-md border-b border-white/5 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="font-display text-xl text-white tracking-wider hidden sm:block mr-2">INKSNAP</Link>
          {/* Search input */}
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search artists, styles..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder:text-white/25 focus:outline-none focus:border-[#e63946]/40 text-sm transition-colors"
            />
          </div>
          {/* City input */}
          <div className="relative w-36 sm:w-48 hidden sm:block">
            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="City"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-white placeholder:text-white/25 focus:outline-none focus:border-[#e63946]/40 text-sm transition-colors"
            />
          </div>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`p-2.5 rounded-xl border text-sm transition-colors flex items-center gap-1.5 ${
              selectedStyles.length > 0 || filtersOpen
                ? 'bg-[#e63946]/10 border-[#e63946]/30 text-[#e63946]'
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
            }`}
          >
            <SlidersHorizontal size={16} />
            {selectedStyles.length > 0 && <span className="text-xs">{selectedStyles.length}</span>}
          </button>
          <div className="flex rounded-xl border border-white/10 overflow-hidden">
            {[{ mode: 'grid', icon: <List size={16} /> }, { mode: 'map', icon: <Map size={16} /> }].map(({ mode, icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as any)}
                className={`p-2.5 transition-colors ${viewMode === mode ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40 hover:text-white'}`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Style filters */}
        {filtersOpen && (
          <div className="max-w-6xl mx-auto mt-3 flex flex-wrap gap-2">
            {TATTOO_STYLES.map(s => (
              <button
                key={s.slug}
                onClick={() => toggleStyle(s.slug)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  selectedStyles.includes(s.slug)
                    ? 'bg-[#e63946] border-[#e63946] text-white'
                    : 'bg-white/5 border-white/10 text-white/50 hover:border-white/30 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
            {selectedStyles.length > 0 && (
              <button onClick={() => setSelectedStyles([])} className="text-xs px-3 py-1.5 text-white/30 hover:text-white flex items-center gap-1">
                <X size={12} /> Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-white/40">
            {loading ? 'Searching...' : `${artists.length} artists found`}
            {city && ` in ${city}`}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="ink-card overflow-hidden">
                <div className="skeleton aspect-square" />
                <div className="p-3 space-y-2">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {artists.map((artist) => {
              const coverImg = artist.portfolio_images?.sort((a: any, b: any) => a.display_order - b.display_order)[0]
              return (
                <Link key={artist.id} href={`/artist/${artist.username}`} className="ink-card overflow-hidden group hover:scale-[1.02] transition-transform">
                  {/* Cover image */}
                  <div className="relative aspect-square bg-[#1f1f24] overflow-hidden">
                    {coverImg ? (
                      <img
                        src={getPublicUrl(BUCKETS.PORTFOLIO, coverImg.storage_path)}
                        alt={artist.display_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/10 font-display text-5xl">
                        {artist.display_name[0]}
                      </div>
                    )}
                    <div className="absolute inset-0 ink-image-overlay opacity-60" />
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
                    {artist.tattoo_styles.length > 0 && (
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
            {artists.length === 0 && !loading && (
              <div className="col-span-4 text-center py-16 text-white/20">
                <Search size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">No artists found. Try adjusting your search.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  )
}
