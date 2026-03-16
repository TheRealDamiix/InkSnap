'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  useMyStudios,
  useCreateStudio,
  useJoinStudio,
  useLeaveStudio,
  useSetPrimaryStudio,
  useStudioLookup,
} from '@/features/studios'
import {
  MapPin, Plus, Search, Star, ExternalLink,
  Trash2, Globe, Phone, Instagram, CheckCircle, Building2, X,
  Zap, Loader2, Send,
} from 'lucide-react'
import Link from 'next/link'
import type { StudioFormValues } from '@/features/studios'
import type { PromotionType } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { FEED_TYPE_CONFIG } from '@/lib/constants'

// ── Blank form ────────────────────────────────────────────────────────
const BLANK: StudioFormValues = {
  name: '', address: '', city: '', state: '', country: 'US',
  website: '', instagram: '', phone: '',
}

export default function StudioDashboardPage() {
  const { profile } = useAuthStore()
  const router = useRouter()

  // Hooks
  const { data: myStudios = [], isLoading } = useMyStudios()
  const createStudio = useCreateStudio()
  const joinStudio = useJoinStudio()
  const leaveStudio = useLeaveStudio()
  const setPrimary = useSetPrimaryStudio()

  // UI state
  const [mode, setMode] = useState<'idle' | 'create' | 'join'>('idle')
  const [form, setForm] = useState<StudioFormValues>(BLANK)
  const [joinQuery, setJoinQuery] = useState('')
  const [confirmLeave, setConfirmLeave] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Studio search for joining
  const { data: joinResults = [] } = useStudioLookup(joinQuery)

  if (!profile || profile.role !== 'artist') return null

  // ── Create submit ──────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.name.trim() || !form.city.trim()) {
      setError('Studio name and city are required.')
      return
    }
    try {
      await createStudio.mutateAsync(form)
      setForm(BLANK)
      setMode('idle')
    } catch (err: any) {
      setError(err.message ?? 'Failed to create studio.')
    }
  }

  // ── Join studio ────────────────────────────────────────────────────
  const handleJoin = async (studioId: string) => {
    setError(null)
    const alreadyIn = myStudios.some((s: any) => s.studio_id === studioId)
    if (alreadyIn) { setError('You are already affiliated with this studio.'); return }
    const isPrimary = myStudios.length === 0
    try {
      await joinStudio.mutateAsync({ studioId, isPrimary })
      setMode('idle')
      setJoinQuery('')
    } catch (err: any) {
      setError(err.message ?? 'Failed to join studio.')
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-8">
        <div className="ink-accent-line mb-3" />
        <div className="flex items-end justify-between">
          <h1 className="font-display text-4xl text-white tracking-wide">MY STUDIOS</h1>
          {mode === 'idle' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setMode('join'); setError(null) }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white/60 hover:text-white hover:border-white/30 transition-all"
              >
                <Search size={15} /> Find Studio
              </button>
              <button
                onClick={() => { setMode('create'); setError(null) }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#e63946] hover:bg-[#d42f3b] text-white text-sm font-medium transition-all"
              >
                <Plus size={15} /> Create Studio
              </button>
            </div>
          )}
        </div>
        <p className="text-white/40 text-sm mt-2">
          Manage where you work — your studio appears on your artist profile.
        </p>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="mb-5 flex items-center gap-2 px-4 py-3 rounded-lg bg-[#e63946]/10 border border-[#e63946]/20 text-[#e63946] text-sm">
          <X size={14} className="shrink-0" />{error}
        </div>
      )}

      {/* ══════════════════════════════════════
          MY STUDIO AFFILIATIONS
          ══════════════════════════════════════ */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
      ) : myStudios.length === 0 && mode === 'idle' ? (
        <div className="ink-card p-10 text-center">
          <Building2 size={40} className="mx-auto text-white/10 mb-4" />
          <p className="text-white/40 text-sm mb-6">You're not affiliated with any studio yet.</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setMode('join')}
              className="px-5 py-2.5 rounded-lg border border-white/10 text-sm text-white/60 hover:text-white hover:border-white/30 transition-all"
            >
              Find a Studio
            </button>
            <button
              onClick={() => setMode('create')}
              className="px-5 py-2.5 rounded-lg bg-[#e63946] hover:bg-[#d42f3b] text-white text-sm font-medium transition-all"
            >
              Create My Studio
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {myStudios.map((aff: any) => {
            const s = aff.studio
            if (!s) return null
            return (
              <div key={aff.id} className="ink-card p-5 flex flex-wrap items-center gap-4">
                {/* Studio avatar */}
                <div className="w-14 h-14 rounded-xl bg-[#e63946]/15 flex items-center justify-center text-[#e63946] font-display text-2xl flex-shrink-0 overflow-hidden">
                  {s.avatar_url
                    ? <img src={s.avatar_url} alt={s.name} className="w-full h-full object-cover" />
                    : s.name[0]?.toUpperCase()
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white">{s.name}</span>
                    {aff.is_primary && (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#e63946]/15 border border-[#e63946]/25 text-[#e63946]">
                        <CheckCircle size={9} /> Primary
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-white/40 mt-0.5">
                    <MapPin size={10} />
                    {[s.city, s.state].filter(Boolean).join(', ')}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-white/25">
                    {s.phone && <Phone size={11} />}
                    {s.website && <Globe size={11} />}
                    {s.instagram && <Instagram size={11} />}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/studio/${aff.studio_id}`}
                    className="p-2 rounded-lg border border-white/10 text-white/40 hover:text-white transition-colors"
                    title="View public profile"
                  >
                    <ExternalLink size={15} />
                  </Link>
                  {!aff.is_primary && (
                    <button
                      onClick={() => setPrimary.mutate({ affiliationId: aff.id, studioId: aff.studio_id })}
                      className="p-2 rounded-lg border border-white/10 text-white/40 hover:text-[#f5c518] hover:border-[#f5c518]/30 transition-colors"
                      title="Set as primary"
                    >
                      <Star size={15} />
                    </button>
                  )}
                  {confirmLeave === aff.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={async () => {
                          await leaveStudio.mutateAsync(aff.id)
                          setConfirmLeave(null)
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#e63946] text-white text-xs font-medium"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmLeave(null)}
                        className="px-3 py-1.5 rounded-lg border border-white/10 text-white/40 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmLeave(aff.id)}
                      className="p-2 rounded-lg border border-white/10 text-white/25 hover:text-[#e63946] hover:border-[#e63946]/30 transition-colors"
                      title="Leave studio"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {/* Add more */}
          {mode === 'idle' && (
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setMode('join'); setError(null) }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-dashed border-white/15 text-sm text-white/30 hover:text-white/60 hover:border-white/30 transition-all"
              >
                <Plus size={14} /> Add another studio
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
          CREATE STUDIO FORM
          ══════════════════════════════════════ */}
      {mode === 'create' && (
        <div className="ink-card p-6 mt-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-2xl text-white tracking-wide">CREATE STUDIO</h2>
            <button onClick={() => { setMode('idle'); setError(null) }} className="text-white/30 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs text-white/40 mb-1.5">Studio Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Black Iron Tattoo"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/40 text-sm transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5">City *</label>
                <input
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="New York"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/40 text-sm transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5">State / Province</label>
                <input
                  value={form.state}
                  onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                  placeholder="NY"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/40 text-sm transition-colors"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-white/40 mb-1.5">Address</label>
                <input
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="123 Main Street"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/40 text-sm transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Phone</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/40 text-sm transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Instagram</label>
                <input
                  value={form.instagram}
                  onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))}
                  placeholder="@studioaccount"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/40 text-sm transition-colors"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-white/40 mb-1.5">Website</label>
                <input
                  value={form.website}
                  onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                  placeholder="https://mystudio.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/40 text-sm transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={createStudio.isPending}
                className="px-6 py-2.5 rounded-lg bg-[#e63946] hover:bg-[#d42f3b] text-white text-sm font-medium transition-all disabled:opacity-50"
              >
                {createStudio.isPending ? 'Creating...' : 'Create Studio'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('idle'); setError(null) }}
                className="px-6 py-2.5 rounded-lg border border-white/10 text-sm text-white/50 hover:text-white transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ══════════════════════════════════════
          STUDIO POSTS (owner only)
          ══════════════════════════════════════ */}
      {myStudios.some((a: any) => a.studio?.owner_id === profile.id) && (
        <StudioPostsSection
          studioId={(myStudios.find((a: any) => a.studio?.owner_id === profile.id) as any)?.studio_id}
          studioName={(myStudios.find((a: any) => a.studio?.owner_id === profile.id) as any)?.studio?.name}
        />
      )}

      {/* ══════════════════════════════════════
          FIND & JOIN A STUDIO
          ══════════════════════════════════════ */}
      {mode === 'join' && (
        <div className="ink-card p-6 mt-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-2xl text-white tracking-wide">FIND A STUDIO</h2>
            <button onClick={() => { setMode('idle'); setError(null); setJoinQuery('') }} className="text-white/30 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="relative mb-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={joinQuery}
              onChange={e => setJoinQuery(e.target.value)}
              placeholder="Search by studio name…"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/40 text-sm transition-colors"
              autoFocus
            />
          </div>

          {joinResults.length > 0 ? (
            <ul className="space-y-2">
              {joinResults.map((s: any) => {
                const alreadyIn = myStudios.some((m: any) => m.studio_id === s.id)
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-3 rounded-xl bg-white/[0.03] border border-white/[0.07]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[#e63946]/15 flex items-center justify-center text-[#e63946] font-display text-base flex-shrink-0 overflow-hidden">
                        {s.avatar_url
                          ? <img src={s.avatar_url} alt={s.name} className="w-full h-full object-cover" />
                          : s.name[0]?.toUpperCase()
                        }
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate">{s.name}</div>
                        <div className="text-xs text-white/40">{[s.city, s.state].filter(Boolean).join(', ')}</div>
                      </div>
                    </div>
                    {alreadyIn ? (
                      <span className="text-xs text-white/30 shrink-0">Already joined</span>
                    ) : (
                      <button
                        onClick={() => handleJoin(s.id)}
                        disabled={joinStudio.isPending}
                        className="px-3 py-1.5 rounded-lg bg-[#e63946] hover:bg-[#d42f3b] text-white text-xs font-medium transition-all disabled:opacity-50 shrink-0"
                      >
                        Join
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : joinQuery.length >= 2 ? (
            <p className="text-center text-sm text-white/30 py-8">
              No studios found.{' '}
              <button
                onClick={() => setMode('create')}
                className="text-[#e63946] hover:underline"
              >
                Create one instead?
              </button>
            </p>
          ) : (
            <p className="text-center text-sm text-white/20 py-8">Type at least 2 characters to search.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Studio Posts sub-component ──────────────────────────────────────────────

interface StudioPostsSectionProps {
  studioId: string
  studioName: string
}

const POST_TYPES: { value: PromotionType; label: string }[] = [
  { value: 'studio_post', label: 'Studio Post' },
  { value: 'flash_deal',  label: 'Flash Deal' },
  { value: 'update',      label: 'Update' },
  { value: 'convention',  label: 'Convention' },
]

function StudioPostsSection({ studioId, studioName }: StudioPostsSectionProps) {
  const qc = useQueryClient()
  const supabase = createClient()
  const [showForm, setShowForm] = useState(false)
  const [postError, setPostError] = useState('')
  const [postForm, setPostForm] = useState({
    type: 'studio_post' as PromotionType,
    title: '',
    body: '',
    price: '',
    expires_at: '',
    location: '',
  })

  const { data: posts, isLoading: loadingPosts } = useQuery({
    queryKey: ['studio-posts', studioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('studio_id', studioId)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data ?? []
    },
  })

  const createPost = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('promotions').insert({
        studio_id: studioId,
        artist_id: null,
        convention_id: null,
        type: postForm.type,
        title: postForm.title,
        body: postForm.body || null,
        price: postForm.price ? parseFloat(postForm.price) : null,
        expires_at: postForm.expires_at || null,
        location: postForm.location || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['studio-posts', studioId] })
      qc.invalidateQueries({ queryKey: ['for-you-feed'] })
      setShowForm(false)
      setPostForm({ type: 'studio_post', title: '', body: '', price: '', expires_at: '', location: '' })
    },
    onError: (err: any) => setPostError(err.message ?? 'Failed to post.'),
  })

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('promotions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['studio-posts', studioId] }),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPostError('')
    if (!postForm.title.trim()) { setPostError('Title is required.'); return }
    createPost.mutate()
  }

  return (
    <div className="mt-10">
      <div className="ink-accent-line mb-3" />
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="font-display text-3xl text-white tracking-wide">STUDIO POSTS</h2>
          <p className="text-white/40 text-sm mt-1">Post as <span className="text-white/60">{studioName}</span> — visible in followers&apos; For You feeds.</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#e63946] hover:bg-[#d42f3b] text-white text-sm font-medium transition-all"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? 'Cancel' : 'New Post'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="ink-card p-5 mb-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Post Type</label>
              <select
                value={postForm.type}
                onChange={e => setPostForm(f => ({ ...f, type: e.target.value as PromotionType }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#e63946]/40 text-sm transition-colors"
              >
                {POST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Price (optional)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={postForm.price}
                onChange={e => setPostForm(f => ({ ...f, price: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/40 text-sm transition-colors"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-white/40 mb-1.5">Title *</label>
              <input
                value={postForm.title}
                onChange={e => setPostForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Flash sale this weekend only!"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/40 text-sm transition-colors"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-white/40 mb-1.5">Body</label>
              <textarea
                rows={3}
                value={postForm.body}
                onChange={e => setPostForm(f => ({ ...f, body: e.target.value }))}
                placeholder="More details…"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/40 text-sm transition-colors resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Location</label>
              <input
                value={postForm.location}
                onChange={e => setPostForm(f => ({ ...f, location: e.target.value }))}
                placeholder="Nashville, TN"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/40 text-sm transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Expires At</label>
              <input
                type="date"
                value={postForm.expires_at}
                onChange={e => setPostForm(f => ({ ...f, expires_at: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#e63946]/40 text-sm transition-colors"
              />
            </div>
          </div>

          {postError && <p className="text-xs text-red-400">{postError}</p>}

          <button
            type="submit"
            disabled={createPost.isPending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#e63946] hover:bg-[#d42f3b] text-white text-sm font-medium transition-all disabled:opacity-50"
          >
            {createPost.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Post
          </button>
        </form>
      )}

      {loadingPosts ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : !posts?.length ? (
        <div className="ink-card p-8 text-center">
          <Zap size={32} className="mx-auto text-white/10 mb-3" />
          <p className="text-white/30 text-sm">No studio posts yet. Create one above!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post: any) => {
            const cfg = FEED_TYPE_CONFIG[post.type] ?? FEED_TYPE_CONFIG.studio_post
            return (
              <div key={post.id} className="ink-card p-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-[10px] text-white/25">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white">{post.title}</p>
                  {post.body && <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{post.body}</p>}
                </div>
                <button
                  onClick={() => deletePost.mutate(post.id)}
                  disabled={deletePost.isPending}
                  className="text-white/20 hover:text-[#e63946] transition-colors flex-shrink-0 mt-1"
                  title="Delete post"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
