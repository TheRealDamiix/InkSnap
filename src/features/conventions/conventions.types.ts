import type { Convention } from '@/types'

export interface ConventionFormValues {
  name: string
  description: string
  city: string
  venue: string
  start_date: string
  end_date: string
}

export interface ConventionSearchResult extends Convention {
  artist_count: number
  artist_previews: Array<{ id: string; display_name: string; avatar_url: string | null }>
}
