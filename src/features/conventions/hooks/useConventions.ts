'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { ConventionFormValues, ConventionSearchResult } from '../conventions.types'
import type { ConventionArtistStatus } from '@/types'

// ── List / search ────────────────────────────────────────────────────────────

export function useConventionList(search = '') {
  return useQuery({
    queryKey: ['conventions', search],
    queryFn: async () => {
      const supabase = createClient()
      let q = supabase
        .from('conventions')
        .select('*')
        .order('start_date', { ascending: true })

      if (search.trim()) {
        q = q.ilike('name', `%${search.trim()}%`)
      }

      const { data, error } = await q
      if (error) throw error

      // Enrich with artist count + previews
      const enriched: ConventionSearchResult[] = await Promise.all(
        (data ?? []).map(async (c) => {
          const { data: aff } = await supabase
            .from('artist_conventions')
            .select('artist_id, profiles(id, display_name, avatar_url)')
            .eq('convention_id', c.id)
            .eq('status', 'confirmed')
            .limit(4)

          const previews = (aff ?? []).map((a: any) => ({
            id: a.profiles?.id ?? a.artist_id,
            display_name: a.profiles?.display_name ?? '',
            avatar_url: a.profiles?.avatar_url ?? null,
          }))

          return {
            ...c,
            artist_count: aff?.length ?? 0,
            artist_previews: previews,
          }
        })
      )

      return enriched
    },
  })
}

// ── My conventions (attending) ───────────────────────────────────────────────

export function useMyAttendingConventions(profileId: string | null | undefined) {
  return useQuery({
    queryKey: ['my-attending-conventions', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('artist_conventions')
        .select('status, conventions(*)')
        .eq('artist_id', profileId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

// ── My organized conventions ─────────────────────────────────────────────────

export function useMyOrganizedConventions(profileId: string | null | undefined) {
  return useQuery({
    queryKey: ['my-organized-conventions', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('conventions')
        .select('*')
        .eq('organizer_id', profileId!)
        .order('start_date', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

// ── Create convention ────────────────────────────────────────────────────────

export function useCreateConvention(profileId: string | null | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: ConventionFormValues) => {
      const supabase = createClient()
      const { error } = await supabase.from('conventions').insert({
        name: values.name,
        description: values.description || null,
        city: values.city || null,
        venue: values.venue || null,
        start_date: values.start_date,
        end_date: values.end_date,
        organizer_id: profileId!,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-organized-conventions'] })
      qc.invalidateQueries({ queryKey: ['conventions'] })
    },
  })
}

// ── Join convention (SECURITY DEFINER RPC) ───────────────────────────────────

export function useJoinConvention() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      conventionId,
      status = 'confirmed',
    }: {
      conventionId: string
      status?: ConventionArtistStatus
    }) => {
      const supabase = createClient()
      const { error } = await supabase.rpc('join_convention', {
        p_convention_id: conventionId,
        p_status: status,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-attending-conventions'] })
      qc.invalidateQueries({ queryKey: ['conventions'] })
    },
  })
}

// ── Convention follow toggle ─────────────────────────────────────────────────

export function useConventionFollow(conventionId: string, profileId: string | null | undefined) {
  const qc = useQueryClient()

  const { data: isFollowing } = useQuery({
    queryKey: ['convention-follow', conventionId, profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('convention_follows')
        .select('follower_id')
        .eq('convention_id', conventionId)
        .eq('follower_id', profileId!)
        .maybeSingle()
      return !!data
    },
  })

  const toggle = useMutation({
    mutationFn: async () => {
      const supabase = createClient()
      if (isFollowing) {
        const { error } = await supabase
          .from('convention_follows')
          .delete()
          .eq('convention_id', conventionId)
          .eq('follower_id', profileId!)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('convention_follows')
          .insert({ convention_id: conventionId, follower_id: profileId! })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['convention-follow', conventionId] })
      qc.invalidateQueries({ queryKey: ['for-you-feed'] })
    },
  })

  return { isFollowing: !!isFollowing, toggle: toggle.mutate, isPending: toggle.isPending }
}

// ── Convention posts ─────────────────────────────────────────────────────────

export function useConventionPosts(conventionId: string) {
  return useQuery({
    queryKey: ['convention-posts', conventionId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('convention_id', conventionId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}
