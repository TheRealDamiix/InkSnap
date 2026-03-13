'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState, useCallback, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth'
import {
  Send, ArrowLeft, Loader2, Paperclip, X, Download, Image as ImageIcon,
} from 'lucide-react'
import Link from 'next/link'
import { format, isToday, isYesterday } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

type Partner = {
  id: string
  display_name: string
  username: string
  avatar_url: string | null
  role: string
}

type Msg = {
  id: string
  conversation_id: string
  sender_id: string
  body: string | null
  attachment_url: string | null
  attachment_name: string | null
  attachment_type: string | null
  created_at: string
  sender: {
    id: string
    display_name: string
    avatar_url: string | null
  }
}

// ─── Timestamp helper ─────────────────────────────────────────────────────────

function MsgTime({ date }: { date: string }) {
  const d = new Date(date)
  if (isToday(d)) return <>{format(d, 'h:mm a')}</>
  if (isYesterday(d)) return <>Yesterday {format(d, 'h:mm a')}</>
  return <>{format(d, 'MMM d, h:mm a')}</>
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function Bubble({ msg, isMine }: { msg: Msg; isMine: boolean }) {
  const isImage = msg.attachment_type?.startsWith('image/')

  return (
    <div className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
      {/* Other user avatar */}
      {!isMine && (
        <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white/40 text-xs flex-shrink-0 mb-0.5">
          {msg.sender?.display_name?.[0]?.toUpperCase() ?? '?'}
        </div>
      )}

      <div className="max-w-[72%] space-y-1">
        {/* Attachment */}
        {msg.attachment_url && (
          <div className={`rounded-2xl overflow-hidden border ${isMine ? 'border-[#e63946]/20' : 'border-white/10'}`}>
            {isImage ? (
              <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={msg.attachment_url}
                  alt={msg.attachment_name ?? 'image'}
                  className="max-w-full max-h-64 object-cover block"
                />
              </a>
            ) : (
              <a
                href={msg.attachment_url}
                download={msg.attachment_name ?? 'file'}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-3 py-2.5 text-sm hover:opacity-80 transition-opacity ${
                  isMine ? 'bg-[#e63946]/20 text-white' : 'bg-white/5 text-white/70'
                }`}
              >
                <Download size={14} className="flex-shrink-0" />
                <span className="truncate max-w-[200px]">{msg.attachment_name ?? 'Download file'}</span>
              </a>
            )}
          </div>
        )}

        {/* Text */}
        {msg.body && (
          <div className={`${isMine ? 'message-bubble-sent' : 'message-bubble-received'} px-4 py-2.5 text-sm leading-relaxed`}>
            {msg.body}
            <div className={`text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-white/30'}`}>
              <MsgTime date={msg.created_at} />
            </div>
          </div>
        )}

        {/* Timestamp for attachment-only */}
        {msg.attachment_url && !msg.body && (
          <div className={`text-[10px] ${isMine ? 'text-right text-white/40' : 'text-left text-white/25'}`}>
            <MsgTime date={msg.created_at} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Skeleton loaders ─────────────────────────────────────────────────────────

function MsgSkeleton({ right }: { right?: boolean }) {
  return (
    <div className={`flex items-end gap-2 ${right ? 'justify-end' : 'justify-start'}`}>
      {!right && <div className="skeleton w-7 h-7 rounded-full flex-shrink-0" />}
      <div className={`skeleton h-10 rounded-2xl ${right ? 'w-44' : 'w-56'}`} />
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

function ConversationView() {
  const params = useParams()
  const convId = params.id as string
  const { profile, loading: authLoading } = useAuthStore()

  const [messages, setMessages] = useState<Msg[]>([])
  const [msgsLoading, setMsgsLoading] = useState(true)
  const [partner, setPartner] = useState<Partner | null>(null)
  const [partnerLoading, setPartnerLoading] = useState(true)

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  // ── Mark conversation as read ─────────────────────────────────────────────
  const markRead = useCallback(async () => {
    if (!profile || !convId) return
    await supabase
      .from('conversation_participants')
      .update({ unread_count: 0, last_read_at: new Date().toISOString() })
      .eq('conversation_id', convId)
      .eq('profile_id', profile.id)
  }, [profile?.id, convId])

  // ── Initial data load + real-time subscription ────────────────────────────
  useEffect(() => {
    if (!profile || !convId) return

    // Load partner profile via SECURITY DEFINER RPC (bypasses cp_select)
    const loadPartner = async () => {
      setPartnerLoading(true)
      const { data } = await supabase.rpc('get_conversation_partner', { conv_id: convId })
      setPartner((data as Partner[])?.[0] ?? null)
      setPartnerLoading(false)
    }

    // Load all messages for this conversation
    const loadMessages = async () => {
      setMsgsLoading(true)
      const { data } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(id, display_name, avatar_url)')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
      setMessages((data ?? []) as Msg[])
      setMsgsLoading(false)
      markRead()
    }

    loadPartner()
    loadMessages()

    // Real-time: listen for new messages in this conversation
    const channel = supabase
      .channel(`conv:${convId}:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convId}`,
        },
        async (payload) => {
          // Fetch sender profile for the incoming message
          const { data: sender } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .eq('id', payload.new.sender_id)
            .single()

          const newMsg = { ...payload.new, sender } as Msg

          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })

          if (payload.new.sender_id !== profile.id) {
            markRead()
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile?.id, convId])

  // ── Auto-scroll to newest message ─────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── File selection ─────────────────────────────────────────────────────────
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('File must be under 5 MB')
      return
    }
    setAttachment(file)
    e.target.value = ''
  }

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if ((!input.trim() && !attachment) || !profile || sending) return
    setSending(true)

    const body = input.trim() || null  // nullable — body is now NOT NULL → NULL allowed after migration 005
    setInput('')

    let attachment_url: string | null = null
    let attachment_name: string | null = null
    let attachment_type: string | null = null

    if (attachment) {
      setUploading(true)
      const ext = attachment.name.split('.').pop() ?? 'bin'
      const path = `${profile.id}/${convId}/${Date.now()}.${ext}`

      const { data: uploaded, error } = await supabase.storage
        .from('chat-attachments')
        .upload(path, attachment, { upsert: false })

      if (uploaded && !error) {
        const { data: pub } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(path)
        attachment_url = pub.publicUrl
        attachment_name = attachment.name
        attachment_type = attachment.type
      }
      setAttachment(null)
      setUploading(false)
    }

    const { error } = await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: profile.id,
      body,
      attachment_url,
      attachment_name,
      attachment_type,
    })

    if (error) {
      // Restore input on failure so user doesn't lose their message
      if (body) setInput(body)
    }

    setSending(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ── Auth loading guard ─────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="font-display text-3xl text-white/20 tracking-wider animate-pulse">INKSNAP</div>
      </div>
    )
  }

  if (!profile) return null

  const busy = sending || uploading

  // Group messages by date
  const getDateLabel = (date: string) => {
    const d = new Date(date)
    if (isToday(d)) return 'Today'
    if (isYesterday(d)) return 'Yesterday'
    return format(d, 'MMMM d, yyyy')
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0b]">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[#111114] flex-shrink-0">
        <Link href="/messages" className="text-white/40 hover:text-white transition-colors p-1 -ml-1">
          <ArrowLeft size={20} />
        </Link>

        {partnerLoading ? (
          <div className="flex items-center gap-3 flex-1">
            <div className="skeleton w-9 h-9 rounded-full" />
            <div className="space-y-1.5">
              <div className="skeleton h-3.5 w-28 rounded" />
              <div className="skeleton h-3 w-20 rounded" />
            </div>
          </div>
        ) : partner ? (
          <>
            <div className="w-9 h-9 rounded-full bg-[#e63946]/20 flex items-center justify-center text-[#e63946] font-display text-base flex-shrink-0">
              {partner.display_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{partner.display_name}</div>
              {partner.role === 'artist' ? (
                <Link
                  href={`/artist/${partner.username}`}
                  className="text-xs text-white/30 hover:text-[#e63946] transition-colors"
                >
                  @{partner.username}
                </Link>
              ) : (
                <span className="text-xs text-white/30">@{partner.username}</span>
              )}
            </div>
          </>
        ) : (
          <span className="text-sm text-white/30">Conversation</span>
        )}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {msgsLoading ? (
          <div className="space-y-4 pt-4">
            <MsgSkeleton />
            <MsgSkeleton right />
            <MsgSkeleton />
            <MsgSkeleton right />
            <MsgSkeleton />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/20 text-sm">Start the conversation</p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, i) => {
              const isMine = msg.sender_id === profile.id
              const prevMsg = messages[i - 1]
              const showDateSep =
                i === 0 ||
                new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()

              return (
                <div key={msg.id}>
                  {showDateSep && (
                    <div className="text-center my-4">
                      <span className="text-[11px] text-white/20 bg-white/5 px-3 py-1 rounded-full">
                        {getDateLabel(msg.created_at)}
                      </span>
                    </div>
                  )}
                  <div className="mb-1">
                    <Bubble msg={msg} isMine={isMine} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Attachment preview bar ── */}
      {attachment && (
        <div className="px-4 py-2 bg-[#111114] border-t border-white/5 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 min-w-0">
            {attachment.type.startsWith('image/')
              ? <ImageIcon size={14} className="text-white/40 flex-shrink-0" />
              : <Paperclip size={14} className="text-white/40 flex-shrink-0" />
            }
            <span className="text-sm text-white/70 truncate">{attachment.name}</span>
            <span className="text-xs text-white/30 flex-shrink-0">
              ({(attachment.size / 1024).toFixed(0)} KB)
            </span>
          </div>
          <button
            onClick={() => setAttachment(null)}
            className="text-white/30 hover:text-white transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="flex items-end gap-2 px-4 py-3 border-t border-white/5 bg-[#111114] flex-shrink-0">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt,.zip"
          onChange={handleFile}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          title="Attach file (max 5 MB)"
          className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors flex-shrink-0 disabled:opacity-40"
        >
          <Paperclip size={18} />
        </button>

        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message…"
          rows={1}
          className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white placeholder:text-white/25 focus:outline-none focus:border-[#e63946]/50 text-sm resize-none transition-colors"
          style={{ maxHeight: '120px' }}
        />

        <button
          onClick={sendMessage}
          disabled={(!input.trim() && !attachment) || busy}
          className="p-2.5 rounded-2xl bg-[#e63946] hover:bg-[#d42f3b] disabled:opacity-40 text-white transition-colors flex-shrink-0"
        >
          {busy
            ? <Loader2 size={18} className="animate-spin" />
            : <Send size={18} />
          }
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
