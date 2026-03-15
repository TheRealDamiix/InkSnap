import type { Studio } from '@/types'

export interface StudioFormValues {
  name: string
  address: string
  city: string
  state: string
  country: string
  website: string
  instagram: string
  phone: string
}

export interface StudioSearchResult extends Studio {
  artist_count: number
  // preview avatars of affiliated artists
  artist_previews: Array<{ id: string; display_name: string; avatar_url: string | null }>
}
