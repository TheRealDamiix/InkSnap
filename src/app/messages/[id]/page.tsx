'use client'

import { Suspense } from 'react'
import { ChatWindow } from '@/features/chat'

export const dynamic = 'force-dynamic'

export default function ConversationPage() {
  return (
    <Suspense>
      <ChatWindow />
    </Suspense>
  )
}
