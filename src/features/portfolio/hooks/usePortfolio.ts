'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { deleteFile, BUCKETS } from '@/lib/storage'
import { uploadPortfolioImage } from '../api/upload'
import type { PortfolioImage } from '../portfolio.types'

// ─────────────────────────────────────────────────────────────────────────────
// usePortfolio — fetch an artist's portfolio images
// ─────────────────────────────────────────────────────────────────────────────

export function usePortfolio(profileId: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['portfolio', profileId],
    queryFn: async (): Promise<PortfolioImage[]> => {
      const { data } = await supabase
        .from('portfolio_images')
        .select('*')
        .eq('artist_id', profileId!)
        .order('display_order', { ascending: true })
      return (data ?? []) as PortfolioImage[]
    },
    enabled: !!profileId,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// useDeletePortfolioImage — removes the DB row AND the storage file
// ─────────────────────────────────────────────────────────────────────────────

export function useDeletePortfolioImage(profileId: string | undefined) {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (img: PortfolioImage) => {
      // Delete DB row first so the image disappears from the UI immediately
      await supabase.from('portfolio_images').delete().eq('id', img.id)
      // Then purge from storage (non-fatal if this fails — orphaned files are harmless)
      await deleteFile(BUCKETS.PORTFOLIO, img.storage_path)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio', profileId] })
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// useUploadPortfolioImages — uploads File[] to storage then inserts DB rows
//
// Accepts `startIndex` in the payload to correctly set display_order for new
// images (caller passes `images.length` from the live query data).
// ─────────────────────────────────────────────────────────────────────────────

export function useUploadPortfolioImages(profileId: string | undefined) {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      files,
      startIndex,
    }: {
      files: File[]
      startIndex: number
    }) => {
      if (!profileId) throw new Error('Not authenticated')

      const uploads = files.map(async (file, i) => {
        const { storagePath } = await uploadPortfolioImage(profileId, file)
        await supabase.from('portfolio_images').insert({
          artist_id: profileId,
          storage_path: storagePath,
          display_order: startIndex + i,
        })
      })

      // Upload all files in parallel; let errors surface per-file
      const results = await Promise.allSettled(uploads)

      // Log individual failures without aborting the whole batch
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`Failed to upload file ${files[i]?.name}:`, r.reason)
        }
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio', profileId] })
    },
  })
}
