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

  const { data: artist } = await supabase
    .from('profiles')
    .select(`
      *,
      portfolio_images(id, storage_path, caption, styles, display_order),
      reviews(id, rating, body, created_at, client:profiles!reviews_client_id_fkey(display_name, username)),
      artist_studios(id, is_primary, studio:studios(*))
    `)
    .eq('username', username)
    .eq('role', 'artist')
    .single()

  if (!artist) notFound()

  return <ArtistProfileClient artist={artist} />
}
