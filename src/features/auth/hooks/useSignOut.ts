'use client'

import { useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth'

// ─────────────────────────────────────────────────────────────────────────────
// useSignOut
//
// Clears the Supabase session, removes persist flags from storage, then hard-
// redirects to /auth/login so server components and middleware start fresh.
// ─────────────────────────────────────────────────────────────────────────────

export function useSignOut() {
  const { setProfile, setLoading } = useAuthStore()

  return useMutation({
    mutationFn: async () => {
      const supabase = createClient()
      await supabase.auth.signOut()

      // Clear persist flags set by the login form
      localStorage.removeItem('inksnap_remember')
      sessionStorage.removeItem('inksnap_session')

      // Clear profile in store immediately so any mounted guards react
      setProfile(null)
      setLoading(false)
    },
    onSuccess: () => {
      window.location.href = '/auth/login'
    },
  })
}
