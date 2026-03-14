// ─────────────────────────────────────────────────────────────────────────────
// Auth domain types
// ─────────────────────────────────────────────────────────────────────────────

import type { Profile } from '@/types'

/** Shape of the Zustand auth store */
export interface AuthState {
  profile: Profile | null
  loading: boolean
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
}

/** Form fields used by the login page */
export interface LoginFormValues {
  identifier: string
  password: string
}

/** Form fields used by the signup page */
export interface SignupFormValues {
  email: string
  password: string
  display_name: string
  username: string
  role: 'client' | 'artist'
}

/** Live status of the async username availability check */
export type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken'
