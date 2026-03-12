'use client'

import { useAuthStore } from '@/lib/stores/auth'
import { ArtistOverview } from '@/components/artist/artist-overview'
import { ClientFeed } from '@/components/client/client-feed'

export default function DashboardPage() {
  const { profile } = useAuthStore()
  if (!profile) return null
  return profile.role === 'artist' ? <ArtistOverview /> : <ClientFeed />
}
