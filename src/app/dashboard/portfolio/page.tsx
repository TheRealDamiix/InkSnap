'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Upload, Trash2, Loader2, Plus } from 'lucide-react'
import { uploadPortfolioImage, getPublicUrl, BUCKETS, deleteFile } from '@/lib/storage'
import type { PortfolioImage } from '@/types'

export default function PortfolioPage() {
  const { profile } = useAuthStore()
  const router = useRouter()
  const [uploading, setUploading] = useState(false)

  // Artist-only — redirect clients
  useEffect(() => {
    if (profile && profile.role !== 'artist') router.replace('/dashboard')
  }, [profile, router])
  const qc = useQueryClient()
  const supabase = createClient()

  const { data: images = [], isLoading } = useQuery({
    queryKey: ['portfolio', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('portfolio_images')
        .select('*')
        .eq('artist_id', profile!.id)
        .order('display_order', { ascending: true })
      return data as PortfolioImage[]
    },
    enabled: !!profile?.id && profile?.role === 'artist',
  })

  const deleteImage = useMutation({
    mutationFn: async (img: PortfolioImage) => {
      await supabase.from('portfolio_images').delete().eq('id', img.id)
      await deleteFile(BUCKETS.PORTFOLIO, img.storage_path)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio', profile?.id] }),
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile || !e.target.files?.length) return
    setUploading(true)
    const files = Array.from(e.target.files)
    for (const file of files) {
      try {
        const path = await uploadPortfolioImage(profile.id, file)
        const storagePath = path.split(BUCKETS.PORTFOLIO + '/')[1] ?? path
        await supabase.from('portfolio_images').insert({
          artist_id: profile.id,
          storage_path: storagePath.startsWith('/') ? storagePath.slice(1) : storagePath,
          display_order: images.length,
        })
      } catch (err) { console.error(err) }
    }
    qc.invalidateQueries({ queryKey: ['portfolio', profile.id] })
    setUploading(false)
    e.target.value = ''
  }

  if (!profile || profile.role !== 'artist') return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl text-white tracking-wide">PORTFOLIO</h1>
          <p className="text-white/40 mt-1">{images.length} images</p>
        </div>
        <label className={`flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e63946] hover:bg-[#d42f3b] text-white text-sm font-medium cursor-pointer transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {uploading ? 'Uploading...' : 'Add Images'}
          <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
        </label>
      </div>

      {/* Upload drop zone (empty state) */}
      {images.length === 0 && !isLoading && (
        <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-white/10 rounded-2xl py-20 cursor-pointer hover:border-[#e63946]/30 transition-colors">
          <Upload size={32} className="text-white/20" />
          <div className="text-center">
            <p className="text-white/30 text-sm">Drop your tattoo photos here</p>
            <p className="text-white/20 text-xs mt-1">JPG, PNG — high resolution recommended</p>
          </div>
          <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
        </label>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton aspect-square rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map((img) => (
            <div key={img.id} className="group relative aspect-square rounded-xl overflow-hidden bg-[#1f1f24]">
              <img
                src={getPublicUrl(BUCKETS.PORTFOLIO, img.storage_path)}
                alt={img.caption ?? 'Portfolio image'}
                className="w-full h-full object-cover"
              />
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button
                  onClick={() => deleteImage.mutate(img)}
                  disabled={deleteImage.isPending}
                  className="p-2.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  {deleteImage.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
