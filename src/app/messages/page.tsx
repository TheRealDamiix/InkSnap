'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/stores/auth'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

type ConvRow = {
  conversation_id: string
  unread_count: number
  other_profile_id: string
  other_display_name: string
  other_username: string
  other_avatar_url: string | null
  other_role: string
  last_message_body: string | null
  last_message_name: string | null
  last_message_type: string | null
  last_message_at: string | null
}

function SkeletonRow() {
  return (
    <div className="ink-card flex items-center gap-3 p-4">
      <div className="skeleton w-11 h-11 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3.5 w-32 rounded" />
        <div className="skeleton h-3 w-48 rounded" />
      </div>
    </div>
  )
}

export default function MessagesPage() {
  const { profile, loading: authLoading } = useAuthStore()
  const [conversations, setConversations] = useState<ConvRow[]>([])
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const load = useCallback(async () => {
    if (!profile) return
    const { data, error } = await supabase.rpc('get_my_conversations')
    setConversations((data as ConvRow[]) ?? [])
    setLoading(false)
  }, [profile?.id])

  useEffect(() => {
    if (!profile) return
    load()

    const channel = supabase
      .channel(`inbox:${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, load)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_participants' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile?.id, load])

  // Auth loading — show spinner so middleware redirect doesn't look like a blank page
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="font-display text-3xl text-white/20 tracking-wider animate-pulse">INKSNAP</div>
      </div>
    )
  }

  if (!profile) return null

  const lastMsgPreview = (conv: ConvRow) => {
    if (!conv.last_message_at) return 'No messages yet'
    if (conv.last_message_body) return conv.last_message_body
    if (conv.last_message_type?.startsWith('image/')) return '📷 Photo'
    if (conv.last_message_name) return `📎 ${conv.last_message_name}`
    return 'Attachment'
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0a0b]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center gap-4">
        <Link href="/dashboard" className="font-display text-xl text-white tracking-wider hidden sm:block hover:text-[#e63946] transition-colors">
          INKSNAP
        </Link>
        <h1 className="font-display text-2xl text-white tracking-wide">MESSAGES</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Loading skeletons */}
        {loading ? (
          <div className="space-y-2">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare size={40} className="text-white/10 mx-auto mb-4" />
            <p className="text-white/30 text-sm">No conversations yet.</p>
            <Link href="/search" className="text-[#e63946] text-sm mt-3 inline-block hover:text-[#ff5a65] transition-colors">
              Find artists to message →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <Link
                key={conv.conversation_id}
                href={`/messages/${conv.conversation_id}`}
                className="ink-card flex items-center gap-3 p-4 hover:scale-[1.01] transition-transform"
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-[#e63946]/20 flex items-center justify-center text-[#e63946] font-display text-lg flex-shrink-0">
                  {conv.other_display_name?.[0]?.toUpperCase() ?? '?'}
                </div>

                {/* Text */}
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-white truncate">
                      {conv.other_display_name}
                    </span>
                    {conv.last_message_at && (
                      <span className="text-[11px] text-white/25 flex-shrink-0">
                        {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })} ago
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/40 truncate mt-0.5">
                    {lastMsgPreview(conv)}
                  </div>
                </div>

                {/* Unread badge */}
                {conv.unread_count > 0 && (
                  <div className="w-5 h-5 rounded-full bg-[#e63946] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {conv.unread_count > 9 ? '9+' : conv.unread_count}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
