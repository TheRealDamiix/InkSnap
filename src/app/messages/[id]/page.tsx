'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState, Suspense, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth'
import { Send, ArrowLeft, Loader2, Paperclip, X, Download, Image as ImageIcon } from 'lucide-react'
import type { Profile } from '@/types'
import Link from 'next/link'
import { format, isToday, isYesterday } from 'date-fns'

function MessageTimestamp({ date }: { date: string }) {
  const d = new Date(date)
  if (isToday(d)) return <span>{format(d, 'h:mm a')}</span>
  if (isYesterday(d)) return <span>Yesterday {format(d, 'h:mm a')}</span>
  return <span>{format(d, 'MMM d, h:mm a')}</span>
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
  sender: Profile
}

function ConversationView() {
  const params = useParams()
  const convId = params.id as string
  const { profile } = useAuthStore()
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [otherParticipant, setOtherParticipant] = useState<Profile | null>(null)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const markRead = useCallback(async () => {
    if (!profile || !convId) return
    await supabase
      .from('conversation_participants')
      .update({ unread_count: 0, last_read_at: new Date().toISOString() })
      .eq('conversation_id', convId)
      .eq('profile_id', profile.id)
  }, [profile, convId])

  useEffect(() => {
    if (!profile || !convId) return

    const loadMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(*)')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
      setMessages((data ?? []) as any)
      markRead()
    }

    const loadParticipant = async () => {
      // Uses SECURITY DEFINER function — bypasses cp_select RLS
      const { data } = await supabase.rpc('get_conversation_partner', { conv_id: convId })
      if (data?.[0]) setOtherParticipant(data[0] as any)
    }

    loadMessages()
    loadParticipant()

    // Real-time: new messages
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
          // Fetch sender profile for the new message
          const { data: sender } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.sender_id)
            .single()
          setMessages(prev => {
            // Avoid duplicates
            if (prev.find(m => m.id === payload.new.id)) return prev
            return [...prev, { ...payload.new, sender } as any]
          })
          if (payload.new.sender_id !== profile.id) markRead()
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile?.id, convId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  const sendMessage = async () => {
    if ((!input.trim() && !attachment) || !profile) return
    setSending(true)
    const body = input.trim()
    setInput('')

    let attachment_url: string | null = null
    let attachment_name: string | null = null
    let attachment_type: string | null = null

    if (attachment) {
      setUploading(true)
      const ext = attachment.name.split('.').pop() ?? 'bin'
      const path = `${convId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data: uploaded, error } = await supabase.storage
        .from('chat-attachments')
        .upload(path, attachment, { upsert: false })

      if (!error && uploaded) {
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

    await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: profile.id,
      body: body || null,
      attachment_url,
      attachment_name,
      attachment_type,
    })

    setSending(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  if (!profile) return null

  const busy = sending || uploading

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0b]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[#111114] flex-shrink-0">
        <Link href="/messages" className="text-white/40 hover:text-white transition-colors p-1">
          <ArrowLeft size={20} />
        </Link>
        {otherParticipant ? (
          <>
            <div className="w-9 h-9 rounded-full bg-[#e63946]/20 flex items-center justify-center text-[#e63946] font-display text-lg flex-shrink-0">
              {otherParticipant.display_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <div className="text-sm font-medium text-white">{otherParticipant.display_name}</div>
              {(otherParticipant as any).role === 'artist' ? (
                <Link
                  href={`/artist/${otherParticipant.username}`}
                  className="text-xs text-white/30 hover:text-[#e63946] transition-colors"
                >
                  @{otherParticipant.username}
                </Link>
              ) : (
                <span className="text-xs text-white/30">@{otherParticipant.username}</span>
              )}
            </div>
          </>
        ) : (
          <div className="text-sm text-white/30">Loading...</div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.map((msg, i) => {
          const isMine = msg.sender_id === profile.id
          const showDate =
            i === 0 ||
            new Date(msg.created_at).toDateString() !==
              new Date(messages[i - 1].created_at).toDateString()
          const isImage = msg.attachment_type?.startsWith('image/')

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="text-center text-xs text-white/20 my-4">
                  <MessageTimestamp date={msg.created_at} />
                </div>
              )}
              <div className={`flex items-end gap-2 mb-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                {!isMine && (
                  <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white/30 text-xs flex-shrink-0">
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
                          <span className="truncate max-w-[200px]">
                            {msg.attachment_name ?? 'Download file'}
                          </span>
                        </a>
                      )}
                    </div>
                  )}
                  {/* Text */}
                  {msg.body && (
                    <div
                      className={`${
                        isMine ? 'message-bubble-sent' : 'message-bubble-received'
                      } px-4 py-2.5 text-sm leading-relaxed`}
                    >
                      {msg.body}
                      <div className={`text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-white/30'}`}>
                        <MessageTimestamp date={msg.created_at} />
                      </div>
                    </div>
                  )}
                  {/* Timestamp for attachment-only messages */}
                  {msg.attachment_url && !msg.body && (
                    <div className={`text-[10px] ${isMine ? 'text-right text-white/40' : 'text-white/25'}`}>
                      <MessageTimestamp date={msg.created_at} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {messages.length === 0 && (
          <div className="text-center text-white/20 text-sm pt-16">
            Start the conversation
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Attachment preview bar */}
      {attachment && (
        <div className="px-4 py-2 bg-[#111114] border-t border-white/5 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 min-w-0">
            {attachment.type.startsWith('image/') ? (
              <ImageIcon size={14} className="text-white/40 flex-shrink-0" />
            ) : (
              <Paperclip size={14} className="text-white/40 flex-shrink-0" />
            )}
            <span className="text-sm text-white/60 truncate">{attachment.name}</span>
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

      {/* Input bar */}
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
          className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors flex-shrink-0 disabled:opacity-40"
          title="Attach file (max 5 MB)"
        >
          <Paperclip size={18} />
        </button>
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
          disabled={(!input.trim() && !attachment) || busy}
          className="p-2.5 rounded-2xl bg-[#e63946] hover:bg-[#d42f3b] disabled:opacity-40 text-white transition-colors flex-shrink-0"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
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
