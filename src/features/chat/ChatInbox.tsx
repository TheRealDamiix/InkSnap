'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MessageCircle, MoreVertical, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { NavLogo } from '@/components/ui/NavLogo'
import { useAuthStore } from '@/lib/stores/auth'
import { useConversations } from './useChat'

// ── Skeleton ─────────────────────────────────────────────────
function ConvSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="skeleton w-11 h-11 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3.5 w-28 rounded" />
        <div className="skeleton h-3 w-44 rounded" />
      </div>
      <div className="skeleton h-3 w-8 rounded" />
    </div>
  )
}

function shortAgo(iso: string | null) {
  if (!iso) return ''
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: false })
      .replace('about ', '')
      .replace('less than a minute', '1m')
      .replace(/ minutes?/, 'm')
      .replace(/ hours?/, 'h')
      .replace(/ days?/, 'd')
      .replace(/ weeks?/, 'w')
      .replace(/ months?/, 'mo')
  } catch {
    return ''
  }
}

// ── Confirmation modal ────────────────────────────────────────
function DeleteConfirm({
  name,
  onCancel,
  onConfirm,
  busy,
}: {
  name: string
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
            <p className="text-white/40 text-xs mt-0.5">with {name}</p>
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

// ── Component ─────────────────────────────────────────────────
export function ChatInbox() {
  const { loading: authLoading } = useAuthStore()
  const { conversations, loading, deleteConversation } = useConversations()

  // Which conversation's ⋮ menu is open
  const [menuId, setMenuId]       = useState<string | null>(null)
  // Which conversation is pending delete confirmation
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting]   = useState(false)

  // Close the menu when clicking outside
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleDeleteConfirm = async () => {
    if (!confirmId) return
    setDeleting(true)
    await deleteConversation(confirmId)
    setDeleting(false)
    setConfirmId(null)
  }

  const confirmingConv = conversations.find(c => c.id === confirmId)

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <NavLogo className="opacity-20 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* Delete confirmation modal */}
      {confirmId && confirmingConv && (
        <DeleteConfirm
          name={confirmingConv.partner?.display_name ?? 'this user'}
          onCancel={() => setConfirmId(null)}
          onConfirm={handleDeleteConfirm}
          busy={deleting}
        />
      )}

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="px-4 py-4 border-b border-white/5 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-white/40 hover:text-white transition-colors p-1 -ml-1"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-semibold text-white">Messages</h1>
        </div>

        {/* Body */}
        {loading ? (
          <div className="divide-y divide-white/5">
            <ConvSkeleton />
            <ConvSkeleton />
            <ConvSkeleton />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <MessageCircle size={36} className="text-white/10" />
            <p className="text-white/30 text-sm">No messages yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {conversations.map(conv => {
              const name    = conv.partner?.display_name ?? 'Unknown'
              const initial = name[0]?.toUpperCase() ?? '?'
              const lm      = conv.last_message
              const isMenuOpen = menuId === conv.id

              const preview = lm?.body
                ? lm.body.length > 55 ? lm.body.slice(0, 55) + '…' : lm.body
                : lm?.attachment_type?.startsWith('image/') ? '📎 Image'
                : lm?.attachment_type                        ? '📎 File'
                : 'Start a conversation'

              return (
                <div key={conv.id} className="group relative flex items-center hover:bg-white/[0.03] transition-colors">
                  {/* Main row — navigate to conversation */}
                  <Link
                    href={`/messages/${conv.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 flex-1 min-w-0"
                    onClick={() => setMenuId(null)}
                  >
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-full bg-[#e63946]/20 flex items-center justify-center text-[#e63946] font-display text-lg flex-shrink-0">
                      {initial}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={`text-sm font-medium truncate ${conv.unread_count > 0 ? 'text-white' : 'text-white/80'}`}>
                          {name}
                        </span>
                        <span className="text-[11px] text-white/25 flex-shrink-0">
                          {shortAgo(conv.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs truncate ${conv.unread_count > 0 ? 'text-white/60' : 'text-white/35'}`}>
                          {preview}
                        </span>
                        {conv.unread_count > 0 && (
                          <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1.5 rounded-full bg-[#f5c518] text-black text-[10px] font-semibold flex items-center justify-center">
                            {conv.unread_count > 9 ? '9+' : conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>

                  {/* ⋮ menu button — visible on hover (desktop) or always (touch) */}
                  <div className="relative pr-3 flex-shrink-0" ref={isMenuOpen ? menuRef : undefined}>
                    <button
                      onClick={e => {
                        e.preventDefault()
                        setMenuId(isMenuOpen ? null : conv.id)
                      }}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white/0 group-hover:text-white/30 hover:!text-white hover:bg-white/10 transition-all"
                      aria-label="Conversation options"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {/* Dropdown */}
                    {isMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 z-30 w-44 bg-[#1a1a1f] border border-white/10 rounded-xl shadow-2xl py-1 overflow-hidden">
                        <button
                          onClick={() => {
                            setMenuId(null)
                            setConfirmId(conv.id)
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={14} />
                          Delete conversation
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
