export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { StudioProfileClient } from '@/components/studio/studio-profile-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function StudioProfilePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Step 1: Fetch the studio
  const { data: studio } = await supabase
    .from('studios')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!studio) notFound()

  // Step 2: Fetch artist_studios for this studio
  const { data: affiliations } = await supabase
    .from('artist_studios')
    .select('artist_id, is_primary')
    .eq('studio_id', id)

  const artistIds = Array.from(new Set((affiliations ?? []).map(a => a.artist_id)))

  // Step 3: Fetch full artist profiles
  let artists: any[] = []
  if (artistIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select(`
        id, username, display_name, avatar_url, city, state,
        tattoo_styles, accepting_bookings, years_experience,
        portfolio_images(id, storage_path, display_order)
      `)
      .in('id', artistIds)
      .eq('role', 'artist')
    artists = data ?? []
  }

  // Step 4: Attach is_primary flag + cover image to each artist
  const fullArtists = artists.map(a => {
    const aff = affiliations?.find(x => x.artist_id === a.id)
    const sorted = [...(a.portfolio_images ?? [])].sort(
      (x: any, y: any) => x.display_order - y.display_order
    )
    return {
      ...a,
      is_primary: aff?.is_primary ?? false,
      portfolio_cover: sorted[0]?.storage_path ?? null,
    }
  })

  // Sort: primary artists first, then alphabetically
  fullArtists.sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1
    if (!a.is_primary && b.is_primary) return 1
    return a.display_name.localeCompare(b.display_name)
  })

  return (
    <StudioProfileClient
      studio={{ ...studio, owner_id: studio.owner_id ?? null, artists: fullArtists }}
    />
  )
}
