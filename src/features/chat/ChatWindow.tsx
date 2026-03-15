'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, isToday, isYesterday } from 'date-fns'
import {
  ArrowLeft, Download, Image as ImageIcon,
  Loader2, MoreVertical, Paperclip, Send, Trash2, X,
} from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth'
import { useMessages } from './useChat'
import type { ChatMessage } from './chat.types'
import { NavLogo } from '@/components/ui/NavLogo'

// ── Small helpers ─────────────────────────────────────────────
function MsgTime({ date }: { date: string }) {
  const d = new Date(date)
  if (isToday(d))     return <>{format(d, 'h:mm a')}</>
  if (isYesterday(d)) return <>Yesterday {format(d, 'h:mm a')}</>
  return <>{format(d, 'MMM d, h:mm a')}</>
}

function DateSep({ date }: { date: string }) {
  const d = new Date(date)
  const label = isToday(d)
    ? 'Today'
    : isYesterday(d)
    ? 'Yesterday'
    : format(d, 'MMMM d, yyyy')
  return (
    <div className="text-center my-4">
      <span className="text-[11px] text-white/20 bg-white/5 px-3 py-1 rounded-full">
        {label}
      </span>
    </div>
  )
}

// ── Skeleton loaders ──────────────────────────────────────────
function PartnerSkeleton() {
  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="skeleton w-9 h-9 rounded-full" />
      <div className="space-y-1.5">
        <div className="skeleton h-3.5 w-28 rounded" />
        <div className="skeleton h-3 w-20 rounded" />
      </div>
    </div>
  )
}

function MsgBubbleSkeleton({ right }: { right?: boolean }) {
  return (
    <div className={`flex items-end gap-2 ${right ? 'justify-end' : 'justify-start'}`}>
      {!right && <div className="skeleton w-7 h-7 rounded-full flex-shrink-0" />}
      <div className={`skeleton h-10 rounded-2xl ${right ? 'w-44' : 'w-56'}`} />
    </div>
  )
}

// ── Message bubble ────────────────────────────────────────────
function Bubble({
  msg,
  isMine,
  isLast,
}: {
  msg: ChatMessage
  isMine: boolean
  isLast: boolean
}) {
  const isImage = msg.attachment_type?.startsWith('image/')
  const fileName = msg.attachment_url
    ? decodeURIComponent(msg.attachment_url.split('/').pop()?.split('?')[0] ?? 'file')
    : 'file'

  return (
    <div className={`flex flex-col gap-1 max-w-[72%] ${isMine ? 'items-end' : 'items-start'}`}>
      {/* Attachment */}
      {msg.attachment_url && (
        <div
          className={`rounded-2xl overflow-hidden border ${
            isMine ? 'border-[#e63946]/20' : 'border-white/10'
          }`}
        >
          {isImage ? (
            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
              <img
                src={msg.attachment_url}
                alt="attachment"
                className="max-w-full max-h-64 object-cover block"
              />
            </a>
          ) : (
            <a
              href={msg.attachment_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 px-3 py-2.5 text-sm hover:opacity-80 transition-opacity ${
                isMine ? 'bg-[#e63946]/20 text-white' : 'bg-white/5 text-white/70'
              }`}
            >
              <Download size={14} className="flex-shrink-0" />
              <span className="truncate max-w-[200px]">{fileName}</span>
            </a>
          )}
        </div>
      )}

      {/* Text body */}
      {msg.body && (
        <div
          className={`px-4 py-2.5 text-sm leading-relaxed ${
            isMine ? 'message-bubble-sent' : 'message-bubble-received'
          }`}
        >
          {msg.body}
        </div>
      )}

      {/* Timestamp — shown only on the last in a group */}
      {isLast && (
        <div className={`text-[10px] px-1 ${isMine ? 'text-white/35 text-right' : 'text-white/25 text-left'}`}>
          <MsgTime date={msg.created_at} />
        </div>
      )}
    </div>
  )
}

// ── Delete confirmation modal ─────────────────────────────────
function DeleteConfirm({
  partnerName,
  onCancel,
  onConfirm,
  busy,
}: {
  partnerName: string
  onCancel: () => void
  onConfirm: () => void
  busy: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111114] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <Trash2 size={18} className="text-red-400" />
          </div>
          <div>
            <p className="text-white font-medium text-sm">Delete conversation?</p>
            <p className="text-white/40 text-xs mt-0.5">with {partnerName}</p>
          </div>
        </div>
        <p className="text-white/50 text-xs leading-relaxed mb-5">
          This removes the conversation from your inbox. The other person can still see their copy.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 py-2 rounded-xl border border-white/10 text-white/60 text-sm hover:text-white hover:border-white/20 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 py-2 rounded-xl bg-red-500/90 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-40"
          >
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export function ChatWindow() {
  const params = useParams()
  const router = useRouter()
  const convId = params?.id as string

  const { profile, loading: authLoading } = useAuthStore()
  const {
    messages, loading: msgsLoading,
    sending, sendMessage,
    deleteConversation,
    partner, partnerLoading,
  } = useMessages(convId ?? null)

  const [input, setInput]               = useState('')
  const [attachment, setAttachment]     = useState<File | null>(null)
  const [menuOpen, setMenuOpen]         = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]         = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)
  const menuRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Close the ⋮ menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleDeleteConfirm = async () => {
    setDeleting(true)
    const ok = await deleteConversation()
    setDeleting(false)
    if (ok) router.push('/messages')
  }

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [input])

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

  const handleSend = async () => {
    if ((!input.trim() && !attachment) || sending) return
    const body = input.trim()
    const file = attachment
    setInput('')
    setAttachment(null)
    const ok = await sendMessage(body, file)
    if (!ok && body) setInput(body)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (authLoading) {
    return (
      <div className="h-[100dvh] bg-[#0a0a0b] flex items-center justify-center">
        <NavLogo className="opacity-20 animate-pulse" />
      </div>
    )
  }
  if (!profile) return null

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0a0a0b]">

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <DeleteConfirm
          partnerName={partner?.display_name ?? 'this user'}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDeleteConfirm}
          busy={deleting}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[#111114] flex-shrink-0 safe-area-top">
        <Link
          href="/messages"
          className="text-white/40 hover:text-white transition-colors p-1 -ml-1"
        >
          <ArrowLeft size={20} />
        </Link>

        {partnerLoading ? (
          <PartnerSkeleton />
        ) : partner ? (
          <>
            <div className="w-9 h-9 rounded-full bg-[#e63946]/20 flex items-center justify-center text-[#e63946] font-display text-base flex-shrink-0 overflow-hidden">
              {partner.avatar_url
                ? <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" />
                : partner.display_name?.[0]?.toUpperCase() ?? '?'
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {partner.display_name}
              </div>
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
          <span className="text-sm text-white/30 flex-1">Conversation</span>
        )}

        {/* ⋮ options menu */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all"
            aria-label="Chat options"
          >
            <MoreVertical size={18} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 w-48 bg-[#1a1a1f] border border-white/10 rounded-xl shadow-2xl py-1 overflow-hidden">
              <button
                onClick={() => { setMenuOpen(false); setConfirmDelete(true) }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={14} />
                Delete chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {msgsLoading ? (
            <div className="space-y-4 pt-4">
              <MsgBubbleSkeleton />
              <MsgBubbleSkeleton right />
              <MsgBubbleSkeleton />
              <MsgBubbleSkeleton right />
              <MsgBubbleSkeleton />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-white/20 text-sm">Start the conversation</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {messages.map((msg, i) => {
                const isMine = msg.sender_id === profile.id
                const prev   = messages[i - 1]
                const next   = messages[i + 1]

                // Date separator
                const showSep =
                  i === 0 ||
                  new Date(msg.created_at).toDateString() !==
                    new Date(prev.created_at).toDateString()

                // Group logic — consecutive messages from same sender
                const sameAsPrev = !showSep && prev && prev.sender_id === msg.sender_id
                const sameAsNext = next && next.sender_id === msg.sender_id &&
                  new Date(next.created_at).toDateString() ===
                    new Date(msg.created_at).toDateString()

                // Show avatar only on last message in a received group
                const showAvatar = !isMine && !sameAsNext

                // Show timestamp only on last message in a group
                const isLastInGroup = !sameAsNext

                // Spacing: tighter within group, looser between groups
                const marginTop = sameAsPrev ? 'mt-0.5' : 'mt-3'

                return (
                  <div key={msg.id} className={marginTop}>
                    {showSep && <DateSep date={msg.created_at} />}

                    <div className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>

                      {/* Partner avatar placeholder — keeps spacing even when hidden */}
                      {!isMine && (
                        <div className="w-7 h-7 flex-shrink-0">
                          {showAvatar ? (
                            <div className="w-7 h-7 rounded-full bg-[#e63946]/15 flex items-center justify-center text-[#e63946] text-xs font-display overflow-hidden">
                              {partner?.avatar_url
                                ? <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" />
                                : msg.sender?.display_name?.[0]?.toUpperCase() ?? '?'
                              }
                            </div>
                          ) : null}
                        </div>
                      )}

                      <Bubble msg={msg} isMine={isMine} isLast={isLastInGroup} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Attachment preview bar ── */}
      {attachment && (
        <div className="px-4 py-2 bg-[#111114] border-t border-white/5 flex items-center gap-3 flex-shrink-0">
          <div className="max-w-2xl mx-auto w-full flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 min-w-0">
            {attachment.type.startsWith('image/') ? (
              <ImageIcon size={14} className="text-white/40 flex-shrink-0" />
            ) : (
              <Paperclip size={14} className="text-white/40 flex-shrink-0" />
            )}
            <span className="text-sm text-white/70 truncate flex-1">{attachment.name}</span>
            <span className="text-xs text-white/30 flex-shrink-0">
              ({(attachment.size / 1024).toFixed(0)} KB)
            </span>
            <button
              onClick={() => setAttachment(null)}
              className="text-white/30 hover:text-white transition-colors flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="border-t border-white/5 bg-[#111114] flex-shrink-0 safe-area-bottom">
        <div className="max-w-2xl mx-auto flex items-end gap-2 px-4 py-3">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt,.zip"
            onChange={handleFile}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={sending}
            title="Attach file (max 5 MB)"
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors flex-shrink-0 disabled:opacity-40 mb-0.5"
          >
            <Paperclip size={18} />
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white placeholder:text-white/25 focus:outline-none focus:border-[#e63946]/50 text-sm resize-none transition-colors overflow-hidden"
          />

          <button
            onClick={handleSend}
            disabled={(!input.trim() && !attachment) || sending}
            className="p-2.5 rounded-2xl bg-[#e63946] hover:bg-[#d42f3b] disabled:opacity-40 text-white transition-colors flex-shrink-0 mb-0.5"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}
