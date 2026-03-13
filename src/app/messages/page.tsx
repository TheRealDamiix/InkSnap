'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuthStore } from '@/lib/stores/auth'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

export default function MessagesPage() {
  const { profile } = useAuthStore()
  const [conversations, setConversations] = useState<any[]>([])
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const load = useCallback(async () => {
    if (!profile) return

    // Get conversations the user is part of
    const { data: participations } = await supabase
      .from('conversation_participants')
      .select('conversation_id, unread_count, created_at')
      .eq('profile_id', profile.id)

    if (!participations?.length) { setConversations([]); return }

    const convIds = participations.map(p => p.conversation_id)

    // Get other participants (works after migration 003 fixes cp_select)
    const { data: others } = await supabase
      .from('conversation_participants')
      .select('conversation_id, profile:profiles(id, display_name, username, avatar_url, role)')
      .in('conversation_id', convIds)
      .neq('profile_id', profile.id)

    // Get last messages for each conversation
    const { data: lastMsgs } = await supabase
      .from('messages')
      .select('conversation_id, body, attachment_name, attachment_type, created_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false })

    const lastMsgMap: Record<string, any> = {}
    lastMsgs?.forEach(m => {
      if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m
    })

    const enriched = participations
      .map(p => ({
        ...p,
        other: (others ?? []).find(o => o.conversation_id === p.conversation_id)?.profile,
        lastMessage: lastMsgMap[p.conversation_id] ?? null,
      }))
      .sort((a, b) => {
        const ta = a.lastMessage?.created_at ?? a.created_at ?? ''
        const tb = b.lastMessage?.created_at ?? b.created_at ?? ''
        return tb.localeCompare(ta)
      })

    setConversations(enriched)
  }, [profile?.id])

  useEffect(() => {
    if (!profile) return
    load()

    // Real-time: refresh list when any new message arrives
    const channel = supabase
      .channel(`inbox:${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile?.id, load])

  if (!profile) return null

  const lastMsgPreview = (conv: any) => {
    if (!conv.lastMessage) return 'No messages yet'
    if (conv.lastMessage.body) return conv.lastMessage.body
    if (conv.lastMessage.attachment_name) return `📎 ${conv.lastMessage.attachment_name}`
    if (conv.lastMessage.attachment_type?.startsWith('image/')) return '📷 Image'
    return 'Attachment'
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      <div className="sticky top-0 z-30 bg-[#0a0a0b]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center gap-4">
        <Link href="/dashboard" className="font-display text-xl text-white tracking-wider hidden sm:block">INKSNAP</Link>
        <div>
          <h1 className="font-display text-2xl text-white tracking-wide">MESSAGES</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {conversations.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare size={40} className="text-white/10 mx-auto mb-4" />
            <p className="text-white/30 text-sm">No messages yet.</p>
            <Link href="/search" className="text-[#e63946] text-sm mt-2 block hover:text-[#ff5a65]">
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
                <div className="w-11 h-11 rounded-full bg-[#e63946]/20 flex items-center justify-center text-[#e63946] font-display text-lg flex-shrink-0">
                  {conv.other?.display_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white truncate">
                      {conv.other?.display_name ?? 'Loading...'}
                    </span>
                    {conv.lastMessage && (
                      <span className="text-xs text-white/25 flex-shrink-0 ml-2">
                        {formatDistanceToNow(new Date(conv.lastMessage.created_at), { addSuffix: false })} ago
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/40 truncate mt-0.5">
                    {lastMsgPreview(conv)}
                  </div>
                </div>
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
