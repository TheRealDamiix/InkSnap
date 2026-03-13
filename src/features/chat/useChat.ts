'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth'
import type {
  ChatMessage,
  ConversationPreview,
  PartnerProfile,
  SenderProfile,
} from './chat.types'

// ─────────────────────────────────────────────────────────────
// useConversations — powers the inbox
// ─────────────────────────────────────────────────────────────
export function useConversations() {
  const { profile, loading: authLoading } = useAuthStore()
  const supabase = useRef(createClient()).current

  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [loading, setLoading] = useState(true)

  // ── initial load ────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!profile) return
    setLoading(true)

    // 1. My participant rows
    const { data: myParts } = await supabase
      .from('conversation_participants')
      .select('conversation_id, unread_count')
      .eq('profile_id', profile.id)

    if (!myParts?.length) {
      setConversations([])
      setLoading(false)
      return
    }

    const convIds = myParts.map(p => p.conversation_id)

    // 2. Partner rows + conversation timestamps + last messages — all parallel
    const [{ data: partnerParts }, { data: convData }, { data: recentMsgs }] =
      await Promise.all([
        supabase
          .from('conversation_participants')
          .select(
            'conversation_id, profile:profiles!conversation_participants_profile_id_fkey(id, display_name, username, avatar_url, role)'
          )
          .in('conversation_id', convIds)
          .neq('profile_id', profile.id),

        supabase
          .from('conversations')
          .select('id, last_message_at')
          .in('id', convIds),

        supabase
          .from('messages')
          .select('conversation_id, body, attachment_type, created_at, sender_id')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: false })
          .limit(convIds.length * 10),
      ])

    // Build lookup maps
    const partnerMap: Record<string, PartnerProfile> = {}
    for (const pp of partnerParts ?? []) {
      if (pp.profile)
        partnerMap[pp.conversation_id] = pp.profile as unknown as PartnerProfile
    }

    const lastMsgAtMap: Record<string, string> = {}
    for (const c of convData ?? []) {
      lastMsgAtMap[c.id] = c.last_message_at
    }

    // First occurrence per conversation (descending order) = most recent message
    const lastMsgMap: Record<string, ConversationPreview['last_message']> = {}
    for (const msg of recentMsgs ?? []) {
      if (!lastMsgMap[msg.conversation_id]) lastMsgMap[msg.conversation_id] = msg
    }

    const unreadMap: Record<string, number> = {}
    for (const p of myParts) unreadMap[p.conversation_id] = p.unread_count

    const result: ConversationPreview[] = convIds
      .map(id => ({
        id,
        last_message_at: lastMsgAtMap[id] ?? null,
        unread_count: unreadMap[id] ?? 0,
        partner: partnerMap[id] ?? null,
        last_message: lastMsgMap[id] ?? null,
      }))
      .sort(
        (a, b) =>
          new Date(b.last_message_at ?? 0).getTime() -
          new Date(a.last_message_at ?? 0).getTime()
      )

    setConversations(result)
    setLoading(false)
  }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authLoading && profile) load()
  }, [authLoading, profile?.id, load])

  // ── realtime ────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return

    const channel = supabase
      .channel(`inbox:${profile.id}`)
      // New message → update last_message + sort
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as ChatMessage
          setConversations(prev =>
            prev
              .map(conv => {
                if (conv.id !== msg.conversation_id) return conv
                return {
                  ...conv,
                  last_message_at: msg.created_at,
                  unread_count:
                    msg.sender_id !== profile.id
                      ? conv.unread_count + 1
                      : conv.unread_count,
                  last_message: {
                    body: msg.body,
                    attachment_type: msg.attachment_type,
                    created_at: msg.created_at,
                    sender_id: msg.sender_id,
                  },
                }
              })
              .sort(
                (a, b) =>
                  new Date(b.last_message_at ?? 0).getTime() -
                  new Date(a.last_message_at ?? 0).getTime()
              )
          )
        }
      )
      // Participant updated (unread count cleared when reading a conv)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversation_participants' },
        (payload) => {
          const row = payload.new as { profile_id: string; conversation_id: string; unread_count: number }
          if (row.profile_id !== profile.id) return
          setConversations(prev =>
            prev.map(conv =>
              conv.id === row.conversation_id
                ? { ...conv, unread_count: row.unread_count }
                : conv
            )
          )
        }
      )
      // New conversation (participant row inserted for us) → full reload
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_participants',
          filter: `profile_id=eq.${profile.id}`,
        },
        () => load()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile?.id, load]) // eslint-disable-line react-hooks/exhaustive-deps

  const deleteConversation = useCallback(
    async (convId: string): Promise<boolean> => {
      if (!profile) return false
      const { error } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', convId)
        .eq('profile_id', profile.id)
      if (!error) {
        setConversations(prev => prev.filter(c => c.id !== convId))
      }
      return !error
    },
    [profile?.id] // eslint-disable-line react-hooks/exhaustive-deps
  )

  return { conversations, loading: authLoading || loading, reload: load, deleteConversation }
}

// ─────────────────────────────────────────────────────────────
// useMessages — powers the chat window
// ─────────────────────────────────────────────────────────────
export function useMessages(convId: string | null) {
  const { profile, loading: authLoading } = useAuthStore()
  const supabase = useRef(createClient()).current

  const [messages, setMessages]         = useState<ChatMessage[]>([])
  const [loading, setLoading]           = useState(true)
  const [sending, setSending]           = useState(false)
  const [partner, setPartner]           = useState<PartnerProfile | null>(null)
  const [partnerLoading, setPartnerLoading] = useState(true)

  // Refs to prevent stale closures inside realtime callbacks
  const profileIdRef  = useRef<string | undefined>(profile?.id)
  const profileMapRef = useRef<Record<string, SenderProfile>>({})

  useEffect(() => { profileIdRef.current = profile?.id }, [profile?.id])

  // ── mark read ───────────────────────────────────────────────
  const markRead = useCallback(async () => {
    if (!profile?.id || !convId) return
    await supabase
      .from('conversation_participants')
      .update({ unread_count: 0 })
      .eq('conversation_id', convId)
      .eq('profile_id', profile.id)
  }, [profile?.id, convId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── load partner + messages + subscribe ─────────────────────
  useEffect(() => {
    if (!profile || !convId) return

    // Partner
    setPartnerLoading(true)
    supabase
      .from('conversation_participants')
      .select(
        'profile:profiles!conversation_participants_profile_id_fkey(id, display_name, username, avatar_url, role)'
      )
      .eq('conversation_id', convId)
      .neq('profile_id', profile.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setPartner((data?.profile as unknown as PartnerProfile) ?? null)
        setPartnerLoading(false)
      })

    // Messages (initial load with sender join via REST)
    setLoading(true)
    supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(id, display_name, avatar_url)')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        const msgs = (data ?? []) as ChatMessage[]
        // Seed profile cache from initial load
        const map: Record<string, SenderProfile> = {}
        for (const m of msgs) {
          if (m.sender) map[m.sender_id] = m.sender
        }
        profileMapRef.current = map
        setMessages(msgs)
        setLoading(false)
        markRead()
      })

    // Realtime subscription
    // Phase 3 rule: no nested joins — use profileMap cache, single lookup if miss
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
          const raw = payload.new as Omit<ChatMessage, 'sender'>

          // Look up sender from local cache first; fetch only on miss
          let sender = profileMapRef.current[raw.sender_id]
          if (!sender) {
            const { data } = await supabase
              .from('profiles')
              .select('id, display_name, avatar_url')
              .eq('id', raw.sender_id)
              .single()
            if (data) {
              sender = data as SenderProfile
              profileMapRef.current = { ...profileMapRef.current, [data.id]: sender }
            }
          }

          const newMsg: ChatMessage = { ...raw, sender }
          // Dedup guard
          setMessages(prev =>
            prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg]
          )

          if (raw.sender_id !== profileIdRef.current) markRead()
        }
      )
      .subscribe()

    // Cleanup — prevents "lock broken by another request" on navigation
    return () => { supabase.removeChannel(channel) }
  }, [profile?.id, convId, markRead]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── delete conversation (leave from this user's side) ───────
  const deleteConversation = useCallback(async (): Promise<boolean> => {
    if (!profile?.id || !convId) return false
    const { error } = await supabase
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', convId)
      .eq('profile_id', profile.id)
    return !error
  }, [profile?.id, convId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── send message ────────────────────────────────────────────
  const sendMessage = useCallback(
    async (body: string, attachmentFile?: File | null): Promise<boolean> => {
      if (!profile || !convId || (!body.trim() && !attachmentFile) || sending)
        return false

      setSending(true)

      let attachment_url: string | null = null
      let attachment_type: string | null = null

      if (attachmentFile) {
        const ext = attachmentFile.name.split('.').pop() ?? 'bin'
        const path = `${profile.id}/${convId}/${Date.now()}.${ext}`
        const { data: up, error: upErr } = await supabase.storage
          .from('chat-attachments')
          .upload(path, attachmentFile, { upsert: false })
        if (up && !upErr) {
          const { data: pub } = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(path)
          attachment_url = pub.publicUrl
          attachment_type = attachmentFile.type
        }
      }

      const { error } = await supabase.from('messages').insert({
        conversation_id: convId,
        sender_id: profile.id,
        body: body.trim() || null,
        attachment_url,
        attachment_type,
      })

      setSending(false)
      return !error
    },
    [profile?.id, convId, sending] // eslint-disable-line react-hooks/exhaustive-deps
  )

  return {
    messages,
    loading: authLoading || loading,
    sending,
    sendMessage,
    deleteConversation,
    partner,
    partnerLoading,
    markRead,
  }
}
