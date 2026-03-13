export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ArtistProfileClient } from '@/components/artist/artist-profile-client'

interface Props {
  params: Promise<{ username: string }>
}

export default async function ArtistProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()

  // Step 1: Find the profile (simple query, no nested joins)
  const { data: artist, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', username)
    .eq('role', 'artist')
    .maybeSingle()

  if (!artist) {
    // Fallback: try without role filter in case role got set wrong
    const { data: anyProfile } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', username)
      .maybeSingle()

    if (!anyProfile) notFound()
    // Profile exists but not as artist — still 404
    notFound()
  }

  // Step 2: Fetch related data with separate queries (avoids FK join issues)
  const [portfolioRes, reviewsRes, studiosRes] = await Promise.all([
    supabase
      .from('portfolio_images')
      .select('id, storage_path, caption, styles, display_order')
      .eq('artist_id', artist.id)
      .order('display_order', { ascending: true }),
    supabase
      .from('reviews')
      .select('id, rating, body, created_at, client_id')
      .eq('artist_id', artist.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('artist_studios')
      .select('id, is_primary, studio_id')
      .eq('artist_id', artist.id),
  ])

  // Step 3: Fetch review authors
  const clientIds = Array.from(new Set((reviewsRes.data ?? []).map(r => r.client_id)))
  let clients: { id: string; display_name: string; username: string }[] = []
  if (clientIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, username')
      .in('id', clientIds)
    clients = data ?? []
  }

  // Step 4: Fetch studios
  const studioIds = Array.from(new Set((studiosRes.data ?? []).map(s => s.studio_id)))
  let studios: any[] = []
  if (studioIds.length > 0) {
    const { data } = await supabase.from('studios').select('*').in('id', studioIds)
    studios = data ?? []
  }

  // Step 5: Combine
  const fullArtist = {
    ...artist,
    portfolio_images: portfolioRes.data ?? [],
    reviews: (reviewsRes.data ?? []).map(r => ({
      ...r,
      client: clients.find(c => c.id === r.client_id) ?? null,
    })),
    artist_studios: (studiosRes.data ?? []).map(s => ({
      ...s,
      studio: studios.find(st => st.id === s.studio_id) ?? null,
    })),
  }

  return <ArtistProfileClient artist={fullArtist} />
}
