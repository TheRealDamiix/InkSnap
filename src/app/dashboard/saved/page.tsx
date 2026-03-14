'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Bookmark, MapPin } from 'lucide-react'
import Link from 'next/link'
import { getPublicUrl, BUCKETS } from '@/lib/storage'
import { TATTOO_STYLES } from '@/lib/constants'

export default function SavedArtistsPage() {
  const { profile } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()

  // Client-only — redirect artists
  useEffect(() => {
    if (profile && profile.role !== 'client') router.replace('/dashboard')
  }, [profile, router])
  const supabase = createClient()

  const { data: saved = [], isLoading } = useQuery({
    queryKey: ['saved-artists', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('saved_artists')
        .select(`
          id, artist_id,
          artist:profiles!saved_artists_artist_id_fkey(
            id, display_name, username, avatar_url, city, state,
            tattoo_styles, accepting_bookings,
            portfolio_images(id, storage_path, display_order)
          )
        `)
        .eq('client_id', profile!.id)
        .order('created_at', { ascending: false })
      return data ?? []
    },
    enabled: !!profile?.id,
  })

  const unsave = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('saved_artists').delete().eq('id', id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-artists', profile?.id] }),
  })

  if (!profile || profile.role !== 'client') return null

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="font-display text-4xl text-white tracking-wide">SAVED ARTISTS</h1>
        <p className="text-white/40 mt-1">{saved.length} bookmarked</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton aspect-[3/4] rounded-xl" />)}
        </div>
      ) : saved.length === 0 ? (
        <div className="ink-card p-12 text-center">
          <Bookmark size={32} className="text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm mb-4">No saved artists yet</p>
          <Link href="/search" className="text-[#e63946] text-sm hover:text-[#ff5a65]">Browse artists →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {saved.map((item: any) => {
            const artist = item.artist
            const coverImg = artist?.portfolio_images?.sort((a: any, b: any) => a.display_order - b.display_order)?.[0]
            return (
              <div key={item.id} className="ink-card overflow-hidden group relative">
                <button
                  onClick={() => unsave.mutate(item.id)}
                  className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/50 text-amber-400 hover:bg-black/70 transition-colors"
                >
                  <Bookmark size={14} fill="currentColor" />
                </button>
                <Link href={`/artist/${artist.username}`}>
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
                    <div className="absolute inset-0 ink-image-overlay" />
                    {artist.accepting_bookings && (
                      <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                    )}
                  </div>
                  <div className="p-3">
                    <div className="font-medium text-sm text-white truncate">{artist.display_name}</div>
                    {artist.city && (
                      <div className="flex items-center gap-1 text-xs text-white/40 mt-0.5">
                        <MapPin size={10} />{artist.city}{artist.state ? `, ${artist.state}` : ''}
                      </div>
                    )}
                    {artist.tattoo_styles?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {artist.tattoo_styles.slice(0, 2).map((slug: string) => (
                          <span key={slug} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                            {TATTOO_STYLES.find(s => s.slug === slug)?.label ?? slug}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
