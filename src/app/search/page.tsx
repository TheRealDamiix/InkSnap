'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, MapPin, SlidersHorizontal, X, Map, List, Building2, Palette } from 'lucide-react'
import { TATTOO_STYLES } from '@/lib/constants'
import Link from 'next/link'
import type { Profile } from '@/types'
import { getPublicUrl, BUCKETS } from '@/lib/storage'
import { StudioCard } from '@/features/studios'
import type { StudioSearchResult } from '@/features/studios'
import { NavLogo } from '@/components/ui/NavLogo'

// ── City autocomplete ─────────────────────────────────────────────────────
interface CitySuggestion {
  display_name: string
  name: string
  address: { city?: string; town?: string; village?: string; state?: string; country?: string }
}

function CityInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInput = (v: string) => {
    onChange(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!v || v.length < 2) { setSuggestions([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(v)}&featuretype=city&format=json&addressdetails=1&limit=6`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const data: CitySuggestion[] = await res.json()
        setSuggestions(data)
        setOpen(data.length > 0)
      } catch { /* ignore */ }
    }, 400)
  }

  const pick = (s: CitySuggestion) => {
    const city = s.address.city ?? s.address.town ?? s.address.village ?? s.name
    onChange(city)
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative w-36 sm:w-48 hidden sm:block">
      <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 z-10" />
      <input
        value={value}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder="City"
        className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-white placeholder:text-white/25 focus:outline-none focus:border-[#e63946]/40 text-sm transition-colors"
      />
      {open && (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1f] border border-white/10 rounded-xl overflow-hidden z-50 shadow-xl">
          {suggestions.map((s, i) => {
            const cityName = s.address.city ?? s.address.town ?? s.address.village ?? s.name
            const state = s.address.state ?? ''
            const country = s.address.country ?? ''
            return (
              <li key={i}>
                <button
                  type="button"
                  onMouseDown={() => pick(s)}
                  className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors"
                >
                  <span className="text-sm text-white">{cityName}</span>
                  {(state || country) && (
                    <span className="text-xs text-white/40 ml-1.5">{[state, country].filter(Boolean).join(', ')}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── Main search content ───────────────────────────────────────────────────
function SearchContent() {
  const searchParams = useSearchParams()
  const [searchType, setSearchType] = useState<'artists' | 'studios'>(
    (searchParams.get('type') as any) ?? 'artists'
  )
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [city, setCity] = useState(searchParams.get('city') ?? '')
  const [selectedStyles, setSelectedStyles] = useState<string[]>(
    searchParams.get('styles')?.split(',').filter(Boolean) ?? []
  )
  const [artists, setArtists] = useState<any[]>([])
  const [studios, setStudios] = useState<StudioSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const supabase = createClient()

  // ── Artist search ──────────────────────────────────────────────────
  const searchArtists = async () => {
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

    if (query) q = q.or(`display_name.ilike.%${query}%,username.ilike.%${query}%,bio.ilike.%${query}%`)
    if (city)  q = q.ilike('city', `%${city}%`)
    if (selectedStyles.length > 0) q = q.overlaps('tattoo_styles', selectedStyles)

    const { data } = await q.limit(40)
    setArtists(data ?? [])
    setLoading(false)
  }

  // ── Studio search ──────────────────────────────────────────────────
  const searchStudios = async () => {
    setLoading(true)
    let q = supabase
      .from('studios')
      .select('*')
      .order('name', { ascending: true })

    if (query) q = q.or(`name.ilike.%${query}%,city.ilike.%${query}%,state.ilike.%${query}%`)
    if (city)  q = q.ilike('city', `%${city}%`)

    const { data: studioData } = await q.limit(40)
    if (!studioData || studioData.length === 0) {
      setStudios([])
      setLoading(false)
      return
    }

    // Fetch artist counts + preview avatars
    const studioIds = studioData.map(s => s.id)
    const { data: affiliations } = await supabase
      .from('artist_studios')
      .select('studio_id, artist_id, profiles(id, display_name, avatar_url)')
      .in('studio_id', studioIds)

    const enriched: StudioSearchResult[] = studioData.map(studio => {
      const affs = affiliations?.filter(a => a.studio_id === studio.id) ?? []
      return {
        ...studio,
        artist_count: affs.length,
        artist_previews: affs.slice(0, 4).map((a: any) => a.profiles).filter(Boolean),
      }
    })

    setStudios(enriched)
    setLoading(false)
  }

  useEffect(() => {
    if (searchType === 'artists') searchArtists()
    else searchStudios()
  }, [query, city, selectedStyles, searchType])

  const toggleStyle = (slug: string) =>
    setSelectedStyles(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug])

  const switchType = (t: 'artists' | 'studios') => {
    setSearchType(t)
    // Clear style filters when switching to studios (studios don't filter by style)
    if (t === 'studios') setSelectedStyles([])
    setFiltersOpen(false)
  }

  const resultCount = searchType === 'artists' ? artists.length : studios.length

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-30 bg-[#0a0a0b]/95 backdrop-blur-md border-b border-white/5 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="hidden sm:block mr-2"><NavLogo /></Link>

          {/* Search input */}
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={searchType === 'artists' ? 'Search artists, styles…' : 'Search studios…'}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder:text-white/25 focus:outline-none focus:border-[#e63946]/40 text-sm transition-colors"
            />
          </div>

          <CityInput value={city} onChange={setCity} />

          {/* Style filter — only for artists */}
          {searchType === 'artists' && (
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
          )}
        </div>

        {/* ── Type tabs: Artists | Studios ── */}
        <div className="max-w-6xl mx-auto mt-3 flex items-center gap-1">
          <button
            onClick={() => switchType('artists')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              searchType === 'artists'
                ? 'bg-[#e63946] text-white'
                : 'bg-white/5 text-white/50 hover:text-white border border-white/10'
            }`}
          >
            <Palette size={14} />
            Artists
          </button>
          <button
            onClick={() => switchType('studios')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              searchType === 'studios'
                ? 'bg-[#e63946] text-white'
                : 'bg-white/5 text-white/50 hover:text-white border border-white/10'
            }`}
          >
            <Building2 size={14} />
            Studios
          </button>
        </div>

        {/* Style filters */}
        {filtersOpen && searchType === 'artists' && (
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

      {/* ── Results ── */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <p className="text-sm text-white/40 mb-5">
          {loading ? 'Searching…' : (
            <>
              <span className="text-[#f5c518] font-medium">{resultCount}</span>
              {' '}{searchType === 'artists' ? 'artists' : 'studios'} found
              {city && ` in ${city}`}
            </>
          )}
        </p>

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
        ) : searchType === 'artists' ? (
          // ── Artist grid ──
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {artists.map((artist) => {
              const coverImg = artist.portfolio_images?.sort((a: any, b: any) => a.display_order - b.display_order)[0]
              return (
                <Link key={artist.id} href={`/artist/${artist.username}`} className="ink-card overflow-hidden group hover:scale-[1.02] transition-transform">
                  <div className="relative aspect-square bg-[#1f1f24] overflow-hidden">
                    {coverImg && (
                      <img
                        src={getPublicUrl(BUCKETS.PORTFOLIO, coverImg.storage_path)}
                        alt={artist.display_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                    <div className="absolute inset-0 ink-image-overlay opacity-60" />
                    {artist.accepting_bookings && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                    )}
                  </div>
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
            {artists.length === 0 && (
              <div className="col-span-4 text-center py-16 text-white/20">
                <Search size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">No artists found. Try adjusting your search.</p>
              </div>
            )}
          </div>
        ) : (
          // ── Studio grid ──
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {studios.map(studio => (
              <StudioCard key={studio.id} studio={studio} />
            ))}
            {studios.length === 0 && (
              <div className="col-span-4 text-center py-16 text-white/20">
                <Building2 size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">No studios found. Try a different search.</p>
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
