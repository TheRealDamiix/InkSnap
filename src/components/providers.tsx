'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth'
import type { Profile } from '@/types'

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    const supabase = createClient()

    let loadingUserId: string | null = null

    const loadProfile = async (userId: string) => {
      // Deduplicate concurrent calls for the same user
      if (loadingUserId === userId) return
      loadingUserId = userId

      try {
        const { data: { user } } = await supabase.auth.getUser()

        // Upsert to avoid race condition between getSession + onAuthStateChange
        if (user) {
          const meta = user.user_metadata ?? {}
          const role = meta.role === 'artist' ? 'artist' : 'client'
          const username = meta.username ?? 'user_' + userId.replace(/-/g, '').slice(0, 8)
          const display_name = meta.display_name ?? username

          await supabase
            .from('profiles')
            .upsert(
              { auth_user_id: userId, role, username, display_name },
              { onConflict: 'auth_user_id', ignoreDuplicates: true }
            )
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', userId)
          .maybeSingle()

        setProfile(profile as Profile | null)
      } finally {
        setLoading(false)
        loadingUserId = null
      }
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // Enforce "remember me = off": if neither persist flag is present,
        // this is a stale session from a previous browser session — sign out.
        const hasRemember = typeof window !== 'undefined' && localStorage.getItem('inksnap_remember') === '1'
        const hasSession  = typeof window !== 'undefined' && sessionStorage.getItem('inksnap_session') === '1'
        if (!hasRemember && !hasSession) {
          await supabase.auth.signOut()
          setLoading(false)
          return
        }
        loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [setProfile, setLoading])

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  )
}
