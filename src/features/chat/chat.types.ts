// ── Profiles ─────────────────────────────────────────────────

export interface SenderProfile {
  id: string
  display_name: string
  avatar_url: string | null
}

export interface PartnerProfile extends SenderProfile {
  username: string
  role: string
}

// ── Messages ─────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  body: string | null
  attachment_url: string | null
  attachment_type: string | null
  created_at: string
  sender?: SenderProfile
}

// ── Conversations (inbox) ────────────────────────────────────

export interface ConversationPreview {
  id: string
  last_message_at: string | null
  unread_count: number
  partner: PartnerProfile | null
  last_message: {
    body: string | null
    attachment_type: string | null
    created_at: string
    sender_id: string
  } | null
}
