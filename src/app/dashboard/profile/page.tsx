'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Upload, Check } from 'lucide-react'
import { TATTOO_STYLES } from '@/lib/constants'
import { uploadAvatar, BUCKETS, getPublicUrl, avatarPath } from '@/lib/storage'

const schema = z.object({
  display_name: z.string().min(2),
  username: z.string().min(3).regex(/^[a-z0-9_]+$/),
  bio: z.string().max(500).optional(),
  location: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  instagram: z.string().optional(),
  website: z.string().optional(),
  years_experience: z.coerce.number().int().min(0).max(50).optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

export default function ProfilePage() {
  const { profile, setProfile } = useAuthStore()
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedStyles, setSelectedStyles] = useState<string[]>(profile?.tattoo_styles ?? [])
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      display_name: profile?.display_name ?? '',
      username: profile?.username ?? '',
      bio: profile?.bio ?? '',
      location: profile?.location ?? '',
      city: profile?.city ?? '',
      state: profile?.state ?? '',
      instagram: profile?.instagram ?? '',
      website: profile?.website ?? '',
      years_experience: profile?.years_experience ?? '',
    },
  })

  const onSubmit = async (data: FormData) => {
    if (!profile) return
    const { data: updated } = await supabase
      .from('profiles')
      .update({
        ...data,
        tattoo_styles: selectedStyles,
        years_experience: data.years_experience !== '' ? Number(data.years_experience) : null,
      })
      .eq('id', profile.id)
      .select()
      .single()
    if (updated) setProfile(updated as any)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile || !e.target.files?.[0]) return
    setUploading(true)
    const url = await uploadAvatar(profile.auth_user_id, e.target.files[0])
    const path = avatarPath(profile.auth_user_id)
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id)
    setProfile({ ...profile, avatar_url: url })
    setUploading(false)
  }

  const toggleStyle = (slug: string) => {
    setSelectedStyles(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug])
  }

  if (!profile) return null

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-4xl text-white tracking-wide">EDIT PROFILE</h1>
        <p className="text-white/40 mt-1">Update your public profile information</p>
      </div>

      {/* Avatar */}
      <div className="ink-card p-5 flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-[#e63946]/20 flex items-center justify-center text-[#e63946] font-display text-4xl flex-shrink-0 overflow-hidden">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            profile.display_name[0].toUpperCase()
          )}
        </div>
        <label className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white text-sm cursor-pointer transition-colors ${uploading ? 'opacity-50' : ''}`}>
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Change Photo
          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </label>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Display Name *</label>
            <input {...register('display_name')}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 text-sm" />
            {errors.display_name && <p className="text-red-400 text-xs mt-1">{errors.display_name.message}</p>}
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Username *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
              <input {...register('username')}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 text-sm" />
            </div>
            {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>}
          </div>
        </div>

        <div>
          <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Bio</label>
          <textarea {...register('bio')} rows={3} placeholder="Tell clients about yourself and your style..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 text-sm resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">City</label>
            <input {...register('city')} placeholder="Austin"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 text-sm" />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">State</label>
            <input {...register('state')} placeholder="TX"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 text-sm" />
          </div>
        </div>

        {profile.role === 'artist' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Instagram</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
                  <input {...register('instagram')}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Years Experience</label>
                <input {...register('years_experience')} type="number" min="0" max="50"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 text-sm" />
              </div>
            </div>

            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest block mb-3">Tattoo Styles</label>
              <div className="flex flex-wrap gap-2">
                {TATTOO_STYLES.map(s => (
                  <button key={s.slug} type="button" onClick={() => toggleStyle(s.slug)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      selectedStyles.includes(s.slug)
                        ? 'bg-[#e63946] border-[#e63946] text-white'
                        : 'bg-white/5 border-white/10 text-white/50 hover:border-white/30'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <button type="submit" disabled={isSubmitting || saved}
          className={`flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-medium transition-all ${
            saved ? 'bg-emerald-400/10 border border-emerald-400/30 text-emerald-400' : 'bg-[#e63946] hover:bg-[#d42f3b] text-white'
          }`}>
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : null}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
