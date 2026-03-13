'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Calendar, Loader2, Star, MessageSquare, MapPin, Ruler, DollarSign, Image
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from '@/lib/constants'
import type { BookingStatus } from '@/types'

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuthStore()
  const qc = useQueryClient()
  const supabase = createClient()

  const [reviewRating, setReviewRating] = useState(5)
  const [reviewBody, setReviewBody] = useState('')
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [artistNote, setArtistNote] = useState('')
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [messaging, setMessaging] = useState(false)

  const isArtist = profile?.role === 'artist'

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking-detail', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select(`
          *,
          artist:profiles!bookings_artist_id_fkey(id, display_name, username, avatar_url, city),
          client:profiles!bookings_client_id_fkey(id, display_name, username, avatar_url),
          review:reviews(id, rating, body)
        `)
        .eq('id', id)
        .single()

      if (!data) return null

      // Fetch booking images separately and generate signed URLs
      const { data: images } = await supabase
        .from('booking_images')
        .select('id, storage_path')
        .eq('booking_id', id)

      const signedImages: { id: string; url: string }[] = []
      for (const img of images ?? []) {
        const { data: signed } = await supabase.storage
          .from('booking-refs')
          .createSignedUrl(img.storage_path, 3600)
        if (signed?.signedUrl) {
          signedImages.push({ id: img.id, url: signed.signedUrl })
        }
      }

      return { ...data, signedImages }
    },
    enabled: !!profile?.id && !!id,
  })

  const updateStatus = useMutation({
    mutationFn: async ({ status, note }: { status: BookingStatus; note?: string }) => {
      await supabase
        .from('bookings')
        .update({ status, ...(note ? { artist_note: note } : {}) })
        .eq('id', id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booking-detail', id] })
      qc.invalidateQueries({ queryKey: ['bookings', profile?.id] })
      qc.invalidateQueries({ queryKey: ['artist-stats', profile?.id] })
      setShowNoteForm(false)
      setArtistNote('')
    },
  })

  const submitReview = useMutation({
    mutationFn: async () => {
      await supabase.from('reviews').insert({
        booking_id: id,
        artist_id: (booking?.artist as any)?.id,
        client_id: profile!.id,
        rating: reviewRating,
        body: reviewBody,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booking-detail', id] })
      setShowReviewForm(false)
      setReviewBody('')
    },
  })

  const openConversation = async () => {
    if (!profile || !booking) return
    setMessaging(true)
    const otherProfileId = isArtist
      ? (booking.artist as any)?.id === profile.id ? (booking.client as any)?.id : (booking.artist as any)?.id
      : (booking.artist as any)?.id
    if (!otherProfileId) { setMessaging(false); return }

    try {
      // Check for existing conversation
      const { data: myConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('profile_id', profile.id)

      const myConvIds = myConvs?.map(c => c.conversation_id) ?? []

      if (myConvIds.length > 0) {
        const { data: shared } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('profile_id', otherProfileId)
          .in('conversation_id', myConvIds)
        if (shared && shared.length > 0) {
          window.location.href = `/messages/${shared[0].conversation_id}`
          return
        }
      }

      // Pre-generate UUID so we never need to SELECT back the conversation
      // (avoids RLS blocking the returning clause before participants exist)
      const convId = crypto.randomUUID()
      await supabase.from('conversations').insert({ id: convId })
      await supabase.from('conversation_participants').insert([
        { conversation_id: convId, profile_id: profile.id },
        { conversation_id: convId, profile_id: otherProfileId },
      ])
      window.location.href = `/messages/${convId}`
    } catch {
      setMessaging(false)
    }
  }

  if (!profile) return null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-white/30" />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="text-center py-20">
        <p className="text-white/30 text-sm">Booking not found.</p>
        <Link href="/dashboard/bookings" className="text-[#e63946] text-sm mt-3 inline-block">← Back to bookings</Link>
      </div>
    )
  }

  const other = isArtist ? (booking.client as any) : (booking.artist as any)
  const hasReview = (booking.review as any)?.length > 0
  const signedImages = (booking as any).signedImages as { id: string; url: string }[]

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back */}
      <Link href="/dashboard/bookings" className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors">
        <ArrowLeft size={16} /> Back to Bookings
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#e63946]/20 flex items-center justify-center text-[#e63946] font-display text-xl flex-shrink-0">
            {other?.display_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <h1 className="font-display text-2xl text-white tracking-wide">
              {isArtist ? 'BOOKING REQUEST' : 'MY BOOKING'}
            </h1>
            <p className="text-white/40 text-sm">
              {isArtist ? `From ${other?.display_name}` : `With ${other?.display_name}`}
            </p>
          </div>
        </div>
        <span className={`text-sm px-3 py-1.5 rounded-full font-medium flex-shrink-0 ${BOOKING_STATUS_COLORS[booking.status as BookingStatus]}`}>
          {BOOKING_STATUS_LABELS[booking.status as BookingStatus]}
        </span>
      </div>

      {/* Details card */}
      <div className="ink-card p-6 space-y-5">
        <div>
          <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Description</p>
          <p className="text-white/80 text-sm leading-relaxed">{booking.description}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {booking.body_placement && (
            <div>
              <p className="text-xs text-white/30 uppercase tracking-widest mb-1 flex items-center gap-1"><MapPin size={10} /> Placement</p>
              <p className="text-white/70 text-sm">{booking.body_placement}</p>
            </div>
          )}
          {booking.size && (
            <div>
              <p className="text-xs text-white/30 uppercase tracking-widest mb-1 flex items-center gap-1"><Ruler size={10} /> Size</p>
              <p className="text-white/70 text-sm">{booking.size}</p>
            </div>
          )}
          {booking.budget_range && (
            <div>
              <p className="text-xs text-white/30 uppercase tracking-widest mb-1 flex items-center gap-1"><DollarSign size={10} /> Budget</p>
              <p className="text-white/70 text-sm">{booking.budget_range}</p>
            </div>
          )}
          {booking.preferred_date_1 && (
            <div>
              <p className="text-xs text-white/30 uppercase tracking-widest mb-1 flex items-center gap-1"><Calendar size={10} /> Preferred Date</p>
              <p className="text-white/70 text-sm">{format(new Date(booking.preferred_date_1), 'MMM d, yyyy')}</p>
            </div>
          )}
          {booking.preferred_date_2 && (
            <div>
              <p className="text-xs text-white/30 uppercase tracking-widest mb-1 flex items-center gap-1"><Calendar size={10} /> Alt. Date</p>
              <p className="text-white/70 text-sm">{format(new Date(booking.preferred_date_2), 'MMM d, yyyy')}</p>
            </div>
          )}
          {booking.confirmed_date && (
            <div>
              <p className="text-xs text-white/30 uppercase tracking-widest mb-1 flex items-center gap-1"><Calendar size={10} /> Confirmed</p>
              <p className="text-emerald-400 text-sm font-medium">{format(new Date(booking.confirmed_date), 'MMM d, yyyy')}</p>
            </div>
          )}
        </div>

        {booking.artist_note && (
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Artist Note</p>
            <p className="text-white/70 text-sm leading-relaxed">{booking.artist_note}</p>
          </div>
        )}

        <p className="text-xs text-white/20">
          Submitted {format(new Date(booking.created_at), 'MMM d, yyyy · h:mm a')}
        </p>
      </div>

      {/* Reference photos */}
      {signedImages.length > 0 && (
        <div className="ink-card p-5">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Image size={12} /> Reference Photos ({signedImages.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {signedImages.map(img => (
              <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer">
                <div className="aspect-square rounded-lg overflow-hidden bg-white/5 hover:opacity-80 transition-opacity">
                  <img src={img.url} alt="Reference" className="w-full h-full object-cover" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Artist actions */}
      {isArtist && booking.status === 'pending' && (
        <div className="ink-card p-5 space-y-4">
          <h3 className="text-sm font-medium text-white">Respond to this request</h3>
          {showNoteForm ? (
            <textarea
              value={artistNote}
              onChange={e => setArtistNote(e.target.value)}
              placeholder="Add a note for the client (optional)..."
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 resize-none"
            />
          ) : (
            <button onClick={() => setShowNoteForm(true)} className="text-xs text-white/30 hover:text-white transition-colors">
              + Add a note to client
            </button>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => updateStatus.mutate({ status: 'confirmed', note: artistNote || undefined })}
              disabled={updateStatus.isPending}
              className="flex-1 py-2.5 rounded-xl bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 text-sm font-medium hover:bg-emerald-400/20 transition-colors disabled:opacity-50"
            >
              {updateStatus.isPending ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Confirm Booking'}
            </button>
            <button
              onClick={() => updateStatus.mutate({ status: 'declined', note: artistNote || undefined })}
              disabled={updateStatus.isPending}
              className="flex-1 py-2.5 rounded-xl bg-red-400/10 border border-red-400/30 text-red-400 text-sm font-medium hover:bg-red-400/20 transition-colors disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {isArtist && booking.status === 'confirmed' && (
        <div className="ink-card p-5">
          <button
            onClick={() => updateStatus.mutate({ status: 'completed' })}
            disabled={updateStatus.isPending}
            className="w-full py-2.5 rounded-xl bg-blue-400/10 border border-blue-400/30 text-blue-400 text-sm font-medium hover:bg-blue-400/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {updateStatus.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            Mark as Completed
          </button>
        </div>
      )}

      {/* Client: leave review */}
      {!isArtist && booking.status === 'completed' && !hasReview && (
        <div className="ink-card p-5 space-y-4">
          {showReviewForm ? (
            <>
              <h3 className="text-sm font-medium text-white">Leave a Review</h3>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(i => (
                  <button key={i} onClick={() => setReviewRating(i)}>
                    <Star size={28} className={i <= reviewRating ? 'text-[#e63946] fill-current' : 'text-white/20 fill-current'} />
                  </button>
                ))}
              </div>
              <textarea
                value={reviewBody}
                onChange={e => setReviewBody(e.target.value)}
                placeholder="Share your experience..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => submitReview.mutate()}
                  disabled={submitReview.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-[#e63946] text-white text-sm font-medium hover:bg-[#d42f3b] transition-colors disabled:opacity-50"
                >
                  {submitReview.isPending ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Submit Review'}
                </button>
                <button onClick={() => setShowReviewForm(false)} className="px-4 py-2.5 rounded-xl bg-white/5 text-white/40 text-sm hover:text-white transition-colors">
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <button onClick={() => setShowReviewForm(true)} className="flex items-center gap-2 text-sm text-[#e63946] hover:text-[#ff5a65] transition-colors">
              <Star size={16} /> Leave a Review
            </button>
          )}
        </div>
      )}

      {/* Existing review */}
      {!isArtist && hasReview && (
        <div className="ink-card p-5">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-3">Your Review</p>
          <div className="flex gap-1 mb-2">
            {[1,2,3,4,5].map(i => (
              <Star key={i} size={16} className={i <= (booking.review as any)?.[0]?.rating ? 'text-[#e63946] fill-current' : 'text-white/10 fill-current'} />
            ))}
          </div>
          {(booking.review as any)?.[0]?.body && (
            <p className="text-sm text-white/60">{(booking.review as any)[0].body}</p>
          )}
        </div>
      )}

      {/* Message button */}
      <button
        onClick={openConversation}
        disabled={messaging}
        className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors disabled:opacity-50"
      >
        {messaging ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
        {messaging ? 'Opening...' : `Message ${other?.display_name}`}
      </button>
    </div>
  )
}
