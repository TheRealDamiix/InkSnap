'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Zap, MapPin, Bell, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Promotion, PromotionType } from '@/types'
import { format } from 'date-fns'

const schema = z.object({
  type: z.enum(['flash_deal', 'update', 'convention']),
  title: z.string().min(3),
  body: z.string().optional(),
  price: z.string().optional(),
  expires_at: z.string().optional(),
  location: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const TYPE_CONFIG = {
  flash_deal: { label: 'Flash Deal', icon: <Zap size={16} />, color: 'text-[#e63946] bg-[#e63946]/10 border-[#e63946]/20' },
  update: { label: 'Artist Update', icon: <Bell size={16} />, color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  convention: { label: 'Convention', icon: <MapPin size={16} />, color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
}

export default function PromotionsPage() {
  const { profile } = useAuthStore()
  const [creating, setCreating] = useState(false)
  const qc = useQueryClient()
  const supabase = createClient()

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['promotions', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('promotions')
        .select('*')
        .eq('artist_id', profile!.id)
        .order('created_at', { ascending: false })
      return data as Promotion[]
    },
    enabled: !!profile?.id,
  })

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'flash_deal' },
  })

  const selectedType = watch('type')

  const create = async (data: FormData) => {
    if (!profile) return
    await supabase.from('promotions').insert({
      artist_id: profile.id,
      type: data.type,
      title: data.title,
      body: data.body || null,
      price: data.price ? Math.round(parseFloat(data.price) * 100) : null,
      expires_at: data.expires_at || null,
      location: data.location || null,
    })
    qc.invalidateQueries({ queryKey: ['promotions', profile.id] })
    reset()
    setCreating(false)
  }

  const deletePromo = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('promotions').delete().eq('id', id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promotions', profile?.id] }),
  })

  if (!profile) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl text-white tracking-wide">PROMOTIONS</h1>
          <p className="text-white/40 mt-1">Flash deals, updates, and convention announcements</p>
        </div>
        <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e63946] hover:bg-[#d42f3b] text-white text-sm font-medium transition-colors">
          <Plus size={16} /> New Post
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="ink-card p-6">
          <h3 className="font-display text-xl text-white tracking-wide mb-5">CREATE PROMOTION</h3>
          <form onSubmit={handleSubmit(create)} className="space-y-4">
            {/* Type selector */}
            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Type</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(TYPE_CONFIG).map(([value, config]) => (
                  <label key={value} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all text-sm ${
                    selectedType === value ? config.color : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                  }`}>
                    <input type="radio" value={value} {...register('type')} className="hidden" />
                    {config.icon}
                    {config.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Title *</label>
              <input
                {...register('title')}
                placeholder="e.g. $150 Flash Roses This Friday"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 text-sm"
              />
              {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Details</label>
              <textarea
                {...register('body')}
                rows={2}
                placeholder="Additional details..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {selectedType === 'flash_deal' && (
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Price ($)</label>
                  <input {...register('price')} type="number" step="0.01" placeholder="150.00"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 text-sm" />
                </div>
              )}
              {selectedType === 'convention' && (
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Location</label>
                  <input {...register('location')} placeholder="e.g. Austin Convention Center"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 text-sm" />
                </div>
              )}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Expires</label>
                <input {...register('expires_at')} type="date"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#e63946]/50 text-sm" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={isSubmitting}
                className="flex-1 py-2.5 bg-[#e63946] hover:bg-[#d42f3b] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                Post Promotion
              </button>
              <button type="button" onClick={() => setCreating(false)}
                className="px-5 py-2.5 bg-white/5 text-white/50 hover:text-white rounded-lg text-sm transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Promotions list */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
      ) : promotions.length === 0 ? (
        <div className="ink-card p-12 text-center">
          <Zap size={32} className="text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">No promotions yet. Post a flash deal or convention date.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promotions.map((promo) => {
            const config = TYPE_CONFIG[promo.type]
            return (
              <div key={promo.id} className="ink-card p-5 flex items-start gap-4">
                <div className={`p-2 rounded-lg border flex-shrink-0 ${config.color}`}>{config.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${config.color}`}>{config.label}</span>
                    {promo.expires_at && <span className="text-xs text-white/25">Expires {format(new Date(promo.expires_at), 'MMM d')}</span>}
                  </div>
                  <h3 className="text-sm font-medium text-white">{promo.title}</h3>
                  {promo.body && <p className="text-xs text-white/50 mt-1 leading-relaxed">{promo.body}</p>}
                  {promo.price && <div className="text-[#e63946] font-display text-xl mt-1">${(promo.price / 100).toFixed(0)}</div>}
                </div>
                <button
                  onClick={() => deletePromo.mutate(promo.id)}
                  disabled={deletePromo.isPending}
                  className="p-1.5 text-white/20 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
