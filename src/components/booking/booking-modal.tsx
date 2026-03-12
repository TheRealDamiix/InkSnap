'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth'
import { X, Upload, Loader2, CheckCircle } from 'lucide-react'
import type { Profile } from '@/types'
import { BUCKETS, bookingRefPath, uploadFile } from '@/lib/storage'

const schema = z.object({
  description: z.string().min(20, 'Please describe your tattoo idea in detail (min 20 chars)'),
  body_placement: z.string().min(2, 'Where on your body?'),
  size: z.string().min(1, 'Approximate size?'),
  preferred_date_1: z.string().optional(),
  preferred_date_2: z.string().optional(),
  budget_range: z.string().min(1, 'Budget range?'),
})

type BookingForm = z.infer<typeof schema>

export function BookingModal({ artist, onClose }: { artist: Profile; onClose: () => void }) {
  const { profile } = useAuthStore()
  const [files, setFiles] = useState<File[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<BookingForm>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: BookingForm) => {
    if (!profile) return
    setError('')
    try {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          artist_id: artist.id,
          client_id: profile.id,
          ...data,
          status: 'pending',
        })
        .select()
        .single()

      if (bookingError) throw bookingError

      // Upload reference images
      if (files.length > 0 && booking) {
        const uploads = files.map(async (file) => {
          const ext = file.name.split('.').pop() ?? 'jpg'
          const imgId = crypto.randomUUID()
          const path = bookingRefPath(booking.id, imgId, ext)
          await uploadFile(BUCKETS.BOOKING_REFS, path, file)
          await supabase.from('booking_images').insert({ booking_id: booking.id, storage_path: path })
        })
        await Promise.all(uploads)
      }

      setSubmitted(true)
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    }
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="ink-card p-8 max-w-md w-full text-center">
          <CheckCircle size={48} className="text-emerald-400 mx-auto mb-4" />
          <h3 className="font-display text-2xl text-white tracking-wide mb-2">REQUEST SENT!</h3>
          <p className="text-white/50 text-sm mb-6">
            {artist.display_name} will review your request and get back to you.
          </p>
          <button onClick={onClose} className="bg-[#e63946] hover:bg-[#d42f3b] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
      <div className="ink-card w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/5 sticky top-0 bg-[#18181c] z-10">
          <div>
            <h3 className="font-display text-xl text-white tracking-wide">BOOKING REQUEST</h3>
            <p className="text-xs text-white/40">for {artist.display_name}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white p-1 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Tattoo Description *</label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Describe your tattoo idea — subject matter, style preferences, any specific details..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 transition-colors text-sm resize-none"
            />
            {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Body Placement *</label>
              <input
                {...register('body_placement')}
                placeholder="e.g. Left forearm"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 transition-colors text-sm"
              />
              {errors.body_placement && <p className="text-red-400 text-xs mt-1">{errors.body_placement.message}</p>}
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Size *</label>
              <input
                {...register('size')}
                placeholder="e.g. 4x4 inches"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 transition-colors text-sm"
              />
              {errors.size && <p className="text-red-400 text-xs mt-1">{errors.size.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Preferred Date 1</label>
              <input
                {...register('preferred_date_1')}
                type="date"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-[#e63946]/50 transition-colors text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Preferred Date 2</label>
              <input
                {...register('preferred_date_2')}
                type="date"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-[#e63946]/50 transition-colors text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Budget Range *</label>
            <input
              {...register('budget_range')}
              placeholder="e.g. $300–$500"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 transition-colors text-sm"
            />
            {errors.budget_range && <p className="text-red-400 text-xs mt-1">{errors.budget_range.message}</p>}
          </div>

          {/* Reference images */}
          <div>
            <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Reference Images (optional)</label>
            <label className="flex items-center justify-center gap-2 border border-dashed border-white/15 rounded-lg py-6 cursor-pointer hover:border-white/30 transition-colors">
              <Upload size={18} className="text-white/30" />
              <span className="text-sm text-white/30">Upload reference photos</span>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
            </label>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {files.map((f, i) => (
                  <div key={i} className="text-xs text-white/40 bg-white/5 rounded px-2 py-1">
                    {f.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#e63946] hover:bg-[#d42f3b] disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
            Send Booking Request
          </button>
        </form>
      </div>
    </div>
  )
}
