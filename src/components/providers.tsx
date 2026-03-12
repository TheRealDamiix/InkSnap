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

    const loadProfile = async (userId: string) => {
      const { data: { user } } = await supabase.auth.getUser()

      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', userId)
        .maybeSingle()

      // Trigger didn't fire — create profile now from auth metadata
      if (!profile && user) {
        const meta = user.user_metadata ?? {}
        const role = meta.role === 'artist' ? 'artist' : 'client'
        const username = meta.username ?? 'user_' + userId.replace(/-/g, '').slice(0, 8)
        const display_name = meta.display_name ?? username

        const { data: created } = await supabase
          .from('profiles')
          .insert({ auth_user_id: userId, role, username, display_name })
          .select()
          .maybeSingle()
        profile = created
      }

      setProfile(profile as Profile | null)
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
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
