'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth'
import {
  useMyAttendingConventions,
  useMyOrganizedConventions,
  useCreateConvention,
  useConventionList,
  useJoinConvention,
  ConventionCard,
} from '@/features/conventions'
import {
  CalendarDays, Plus, Search, X, Loader2,
  Calendar, MapPin, CheckCircle2
} from 'lucide-react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'

export default function ConventionsDashboardPage() {
  const { profile } = useAuthStore()
  const [tab, setTab] = useState<'attending' | 'organizing'>('attending')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [createForm, setCreateForm] = useState({
    name: '', description: '', city: '', venue: '',
    start_date: '', end_date: '',
  })
  const [createError, setCreateError] = useState('')

  const { data: attending, isLoading: loadingAttending } = useMyAttendingConventions(profile?.id)
  const { data: organized, isLoading: loadingOrganized } = useMyOrganizedConventions(profile?.id)
  const { data: searchResults, isLoading: loadingSearch } = useConventionList(searchQuery)
  const { mutate: createConvention, isPending: creating } = useCreateConvention(profile?.id)
  const { mutate: joinConvention, isPending: joining } = useJoinConvention()

  if (!profile || profile.role !== 'artist') {
    return (
      <div className="p-6 text-white/40 text-sm">
        This page is for artists only.
      </div>
    )
  }

  const joinedIds = new Set(
    (attending ?? []).map((a: any) => a.conventions?.id).filter(Boolean)
  )

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError('')
    if (!createForm.name || !createForm.start_date || !createForm.end_date) {
      setCreateError('Name, start date, and end date are required.')
      return
    }
    createConvention(createForm, {
      onSuccess: () => {
        setCreateForm({ name: '', description: '', city: '', venue: '', start_date: '', end_date: '' })
        setShowCreateForm(false)
        setTab('organizing')
      },
      onError: (err: any) => setCreateError(err.message ?? 'Something went wrong.'),
    })
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays size={20} className="text-[#e63946]" />
          <h1 className="text-lg font-display font-bold text-white">Conventions</h1>
        </div>
        <button
          onClick={() => setShowCreateForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#e63946]/20 text-[#e63946] hover:bg-[#e63946]/30 text-xs font-medium transition-colors"
        >
          {showCreateForm ? <X size={13} /> : <Plus size={13} />}
          {showCreateForm ? 'Cancel' : 'Create Event'}
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <form onSubmit={handleCreate} className="ink-card p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-white">New Convention / Event</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-xs text-white/40">Event Name *</label>
              <input
                className="ink-input"
                placeholder="e.g. Ink Masters Nashville 2026"
                value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-xs text-white/40">Description</label>
              <textarea
                className="ink-input resize-none h-20"
                placeholder="Tell artists and clients about this event…"
                value={createForm.description}
                onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/40">Venue</label>
              <input
                className="ink-input"
                placeholder="Convention Center"
                value={createForm.venue}
                onChange={e => setCreateForm(f => ({ ...f, venue: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/40">City</label>
              <input
                className="ink-input"
                placeholder="Nashville, TN"
                value={createForm.city}
                onChange={e => setCreateForm(f => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/40">Start Date *</label>
              <input
                type="date"
                className="ink-input"
                value={createForm.start_date}
                onChange={e => setCreateForm(f => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/40">End Date *</label>
              <input
                type="date"
                className="ink-input"
                value={createForm.end_date}
                onChange={e => setCreateForm(f => ({ ...f, end_date: e.target.value }))}
              />
            </div>
          </div>

          {createError && <p className="text-xs text-red-400">{createError}</p>}

          <button
            type="submit"
            disabled={creating}
            className="ink-btn-primary flex items-center gap-2 justify-center"
          >
            {creating && <Loader2 size={14} className="animate-spin" />}
            Create Event
          </button>
        </form>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-white/5">
        {(['attending', 'organizing'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'text-white border-[#e63946]'
                : 'text-white/30 border-transparent hover:text-white/60'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Attending tab */}
      {tab === 'attending' && (
        <div className="flex flex-col gap-4">
          {/* Search to join */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
              <input
                className="ink-input pl-8"
                placeholder="Find a convention to join…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {searchQuery.length >= 2 && (
              <div className="flex flex-col gap-2">
                {loadingSearch && (
                  <p className="text-xs text-white/30 flex items-center gap-1">
                    <Loader2 size={12} className="animate-spin" /> Searching…
                  </p>
                )}
                {!loadingSearch && (searchResults ?? []).map(c => {
                  const alreadyJoined = joinedIds.has(c.id)
                  return (
                    <div key={c.id} className="ink-card p-3 flex items-center gap-3">
                      <div className="flex flex-col flex-1 min-w-0">
                        <Link href={`/convention/${c.id}`} className="text-sm font-semibold text-white hover:text-[#e63946] truncate">
                          {c.name}
                        </Link>
                        {c.city && (
                          <span className="text-[10px] text-white/30 flex items-center gap-1 mt-0.5">
                            <MapPin size={9} />{c.city}
                          </span>
                        )}
                        <span className="text-[10px] text-purple-400/70 flex items-center gap-1 mt-0.5">
                          <Calendar size={9} />
                          {format(parseISO(c.start_date), 'MMM d')} – {format(parseISO(c.end_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                      {alreadyJoined ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400">
                          <CheckCircle2 size={13} /> Attending
                        </span>
                      ) : (
                        <button
                          onClick={() => joinConvention({ conventionId: c.id })}
                          disabled={joining}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#e63946]/20 text-[#e63946] hover:bg-[#e63946]/30 text-xs font-medium"
                        >
                          {joining && <Loader2 size={11} className="animate-spin" />}
                          RSVP
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Currently attending */}
          <h3 className="text-xs text-white/30 uppercase tracking-wider">Your Upcoming Events</h3>
          {loadingAttending ? (
            <p className="text-xs text-white/30">Loading…</p>
          ) : (attending ?? []).length === 0 ? (
            <p className="text-sm text-white/30 text-center py-6">
              Not attending any conventions yet. Search above to RSVP.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(attending ?? []).map((a: any) => {
                const c = a.conventions
                if (!c) return null
                return (
                  <ConventionCard
                    key={c.id}
                    convention={{ ...c, artist_count: 0, artist_previews: [] }}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Organizing tab */}
      {tab === 'organizing' && (
        <div className="flex flex-col gap-4">
          {loadingOrganized ? (
            <p className="text-xs text-white/30">Loading…</p>
          ) : (organized ?? []).length === 0 ? (
            <p className="text-sm text-white/30 text-center py-6">
              No events organized yet. Click "Create Event" above to get started.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(organized ?? []).map((c: any) => (
                <ConventionCard
                  key={c.id}
                  convention={{ ...c, artist_count: 0, artist_previews: [] }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
