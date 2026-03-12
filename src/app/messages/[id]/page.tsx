'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth'
import { Send, ArrowLeft, Loader2 } from 'lucide-react'
import type { Message, Conversation, Profile } from '@/types'
import Link from 'next/link'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'

function MessageTimestamp({ date }: { date: string }) {
  const d = new Date(date)
  if (isToday(d)) return <span>{format(d, 'h:mm a')}</span>
  if (isYesterday(d)) return <span>Yesterday {format(d, 'h:mm a')}</span>
  return <span>{format(d, 'MMM d, h:mm a')}</span>
}

function ConversationView() {
  const params = useParams()
  const convId = params.id as string
  const { profile } = useAuthStore()
  const router = useRouter()
  const [messages, setMessages] = useState<(Message & { sender: Profile })[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [otherParticipant, setOtherParticipant] = useState<Profile | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!profile || !convId) return

    // Load messages
    const loadMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(*)')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
      setMessages((data ?? []) as any)

      // Mark as read
      await supabase
        .from('conversation_participants')
        .update({ unread_count: 0, last_read_at: new Date().toISOString() })
        .eq('conversation_id', convId)
        .eq('profile_id', profile.id)
    }

    // Load other participant
    const loadParticipants = async () => {
      const { data } = await supabase
        .from('conversation_participants')
        .select('profile:profiles(*)')
        .eq('conversation_id', convId)
        .neq('profile_id', profile.id)
        .single()
      setOtherParticipant((data?.profile ?? null) as any)
    }

    loadMessages()
    loadParticipants()

    // Subscribe to new messages (Realtime)
    const channel = supabase
      .channel(`conversation:${convId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
        async (payload) => {
          // Fetch sender info
          const { data: sender } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.sender_id)
            .single()
          setMessages(prev => [...prev, { ...payload.new, sender } as any])
          // Mark as read if not sender
          if (payload.new.sender_id !== profile.id) {
            await supabase
              .from('conversation_participants')
              .update({ unread_count: 0, last_read_at: new Date().toISOString() })
              .eq('conversation_id', convId)
              .eq('profile_id', profile.id)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile, convId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || !profile) return
    setSending(true)
    const body = input.trim()
    setInput('')
    await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: profile.id,
      body,
    })
    setSending(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  if (!profile) return null

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0b]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[#111114] flex-shrink-0">
        <Link href="/messages" className="text-white/40 hover:text-white transition-colors p-1">
          <ArrowLeft size={20} />
        </Link>
        {otherParticipant && (
          <>
            <div className="w-9 h-9 rounded-full bg-[#e63946]/20 flex items-center justify-center text-[#e63946] font-display text-lg flex-shrink-0">
              {otherParticipant.display_name[0]}
            </div>
            <div>
              <div className="text-sm font-medium text-white">{otherParticipant.display_name}</div>
              <Link href={`/artist/${otherParticipant.username}`} className="text-xs text-white/30 hover:text-[#e63946] transition-colors">
                @{otherParticipant.username}
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => {
          const isMine = msg.sender_id === profile.id
          const showDate = i === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[i-1].created_at).toDateString()
          return (
            <div key={msg.id}>
              {showDate && (
                <div className="text-center text-xs text-white/20 my-4">
                  <MessageTimestamp date={msg.created_at} />
                </div>
              )}
              <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                {!isMine && (
                  <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white/30 text-xs mr-2 flex-shrink-0 self-end">
                    {msg.sender?.display_name?.[0]}
                  </div>
                )}
                <div className={`max-w-[70%] ${isMine ? 'message-bubble-sent' : 'message-bubble-received'} px-4 py-2.5 text-sm leading-relaxed`}>
                  {msg.body}
                  <div className={`text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-white/30'}`}>
                    <MessageTimestamp date={msg.created_at} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        {messages.length === 0 && (
          <div className="text-center text-white/20 text-sm pt-12">
            Start the conversation
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 px-4 py-3 border-t border-white/5 bg-[#111114] flex-shrink-0">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white placeholder:text-white/25 focus:outline-none focus:border-[#e63946]/40 text-sm resize-none transition-colors"
          style={{ maxHeight: '120px' }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          className="p-2.5 rounded-2xl bg-[#e63946] hover:bg-[#d42f3b] disabled:opacity-40 text-white transition-colors flex-shrink-0"
        >
          {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  )
}

export default function ConversationPage() {
  return (
    <Suspense>
      <ConversationView />
    </Suspense>
  )
}
