'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function UnreadBadge({ profileId }: { profileId: string }) {
  const [count, setCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('conversation_participants')
        .select('unread_count')
        .eq('profile_id', profileId)
      const total = data?.reduce((s, p) => s + p.unread_count, 0) ?? 0
      setCount(total)
    }
    load()

    const channel = supabase
      .channel(`unread:${profileId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversation_participants',
        filter: `profile_id=eq.${profileId}`,
      }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profileId])

  if (count === 0) return null

  return (
    <span className="ml-auto flex items-center justify-center w-4.5 h-4.5 min-w-[18px] h-[18px] rounded-full bg-[#e63946] text-white text-[10px] font-bold px-1">
      {count > 9 ? '9+' : count}
    </span>
  )
}
