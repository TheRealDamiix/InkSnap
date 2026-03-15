'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth'
import type { StudioFormValues } from '../studios.types'

// ── Fetch studios for search ────────────────────────────────────────
export function useStudioSearch(query: string, city: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['studio-search', query, city],
    queryFn: async () => {
      let q = supabase
        .from('studios')
        .select('id, name, city, state, country, address, website, instagram, phone, avatar_url')
        .order('name', { ascending: true })

      if (query) {
        q = q.or(`name.ilike.%${query}%,city.ilike.%${query}%,state.ilike.%${query}%`)
      }
      if (city) {
        q = q.ilike('city', `%${city}%`)
      }

      const { data: studios, error } = await q.limit(40)
      if (error) throw error
      if (!studios || studios.length === 0) return []

      // Fetch artist counts + preview avatars for each studio
      const studioIds = studios.map(s => s.id)
      const { data: affiliations } = await supabase
        .from('artist_studios')
        .select('studio_id, artist_id, profiles(id, display_name, avatar_url)')
        .in('studio_id', studioIds)

      return studios.map(studio => {
        const studioAffs = affiliations?.filter(a => a.studio_id === studio.id) ?? []
        return {
          ...studio,
          artist_count: studioAffs.length,
          artist_previews: studioAffs
            .slice(0, 4)
            .map((a: any) => a.profiles)
            .filter(Boolean),
        }
      })
    },
    staleTime: 30_000,
  })
}

// ── Fetch all studios for joining (search by name) ──────────────────
export function useStudioLookup(query: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['studio-lookup', query],
    queryFn: async () => {
      if (!query || query.length < 2) return []
      const { data } = await supabase
        .from('studios')
        .select('id, name, city, state, avatar_url')
        .ilike('name', `%${query}%`)
        .limit(10)
      return data ?? []
    },
  })
}

// ── Fetch current artist's studio affiliations ─────────────────────
export function useMyStudios() {
  const { profile } = useAuthStore()
  const supabase = createClient()

  return useQuery({
    queryKey: ['my-studios', profile?.id],
    queryFn: async () => {
      if (!profile) return []
      const { data: affiliations } = await supabase
        .from('artist_studios')
        .select('id, is_primary, studio_id, start_date, end_date')
        .eq('artist_id', profile.id)

      if (!affiliations || affiliations.length === 0) return []

      const studioIds = affiliations.map(a => a.studio_id)
      const { data: studios } = await supabase
        .from('studios')
        .select('*')
        .in('id', studioIds)

      return affiliations.map(aff => ({
        ...aff,
        studio: studios?.find(s => s.id === aff.studio_id) ?? null,
      }))
    },
    enabled: !!profile,
  })
}

// ── Create a new studio ─────────────────────────────────────────────
export function useCreateStudio() {
  const { profile } = useAuthStore()
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (values: StudioFormValues) => {
      if (!profile) throw new Error('Not authenticated')

      // Insert studio with owner_id = current profile
      const { data: studio, error: studioError } = await supabase
        .from('studios')
        .insert({
          name: values.name,
          address: values.address || null,
          city: values.city,
          state: values.state || null,
          country: values.country || 'US',
          website: values.website || null,
          instagram: values.instagram || null,
          phone: values.phone || null,
          owner_id: profile.id,
        })
        .select('id')
        .single()

      if (studioError) throw studioError

      // Automatically affiliate the creator as a primary artist via RPC
      // (direct INSERT hits the same RLS issue as useJoinStudio)
      const { error: affError } = await supabase.rpc('join_studio', {
        p_studio_id: studio.id,
        p_is_primary: true,
      })

      if (affError) throw affError
      return studio.id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-studios'] })
    },
  })
}

// ── Join an existing studio ─────────────────────────────────────────
// Uses join_studio RPC (SECURITY DEFINER) — same pattern as create_conversation.
// Direct INSERT fails because my_profile_id() can return NULL client-side.
export function useJoinStudio() {
  const { profile } = useAuthStore()
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ studioId, isPrimary }: { studioId: string; isPrimary: boolean }) => {
      if (!profile) throw new Error('Not authenticated')
      const { error } = await supabase.rpc('join_studio', {
        p_studio_id: studioId,
        p_is_primary: isPrimary,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-studios'] })
    },
  })
}

// ── Leave a studio ──────────────────────────────────────────────────
export function useLeaveStudio() {
  const { profile } = useAuthStore()
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (affiliationId: string) => {
      if (!profile) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('artist_studios')
        .delete()
        .eq('id', affiliationId)
        .eq('artist_id', profile.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-studios'] })
    },
  })
}

// ── Set primary studio ──────────────────────────────────────────────
export function useSetPrimaryStudio() {
  const { profile } = useAuthStore()
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ affiliationId, studioId }: { affiliationId: string; studioId: string }) => {
      if (!profile) throw new Error('Not authenticated')
      // Unset all primary for this artist first
      await supabase
        .from('artist_studios')
        .update({ is_primary: false })
        .eq('artist_id', profile.id)
      // Then set the chosen one
      await supabase
        .from('artist_studios')
        .update({ is_primary: true })
        .eq('id', affiliationId)
        .eq('artist_id', profile.id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-studios'] })
    },
  })
}
