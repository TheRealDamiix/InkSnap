export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ConventionProfileClient } from '@/components/convention/convention-profile-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ConventionProfilePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Step 1: Fetch the convention
  const { data: convention } = await supabase
    .from('conventions')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!convention) notFound()

  // Step 2: Fetch organizer profile
  const { data: organizer } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('id', convention.organizer_id)
    .maybeSingle()

  // Step 3: Fetch artist_conventions for this event
  const { data: attendances } = await supabase
    .from('artist_conventions')
    .select('artist_id, status')
    .eq('convention_id', id)
    .eq('status', 'confirmed')

  const artistIds = Array.from(new Set((attendances ?? []).map(a => a.artist_id)))

  // Step 4: Fetch full artist profiles
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

  // Step 5: Attach cover image to each artist
  const fullArtists = artists.map(a => {
    const sorted = [...(a.portfolio_images ?? [])].sort(
      (x: any, y: any) => x.display_order - y.display_order
    )
    return {
      ...a,
      portfolio_cover: sorted[0]?.storage_path ?? null,
    }
  })

  // Sort alphabetically
  fullArtists.sort((a, b) => a.display_name.localeCompare(b.display_name))

  return (
    <ConventionProfileClient
      convention={convention}
      organizer={organizer ?? null}
      artists={fullArtists}
    />
  )
}
