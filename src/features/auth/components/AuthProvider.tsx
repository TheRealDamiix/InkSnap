'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth'
import type { Profile } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// AuthProvider
//
// Bootstraps auth state on app load:
//   1. Calls getSession to detect an existing session
//   2. Enforces "remember me" — stale sessions without the persist flag are
//      signed out immediately (browser-session scoped auth)
//   3. Upserts a profile row on first sign-in (avoids race between
//      getSession + onAuthStateChange)
//   4. Subscribes to onAuthStateChange for live sign-in / sign-out events
// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    const supabase = createClient()

    // Deduplicate concurrent calls for the same user
    let loadingUserId: string | null = null

    const loadProfile = async (userId: string) => {
      if (loadingUserId === userId) return
      loadingUserId = userId

      try {
        const { data: { user } } = await supabase.auth.getUser()

        // Upsert to handle the race between getSession + onAuthStateChange
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

    // Check for an existing session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // Enforce "remember me = off": stale sessions without a persist flag → sign out
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

    // Subscribe to live auth state changes
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
