// ─────────────────────────────────────────────────────────────────────────────
// Auth feature — Index Firewall
// All external imports MUST go through this barrel.
// Never import from internal paths directly.
// ─────────────────────────────────────────────────────────────────────────────

// Components
export { AuthProvider } from './components/AuthProvider'
export { LoginForm }   from './components/LoginForm'
export { SignupForm }  from './components/SignupForm'

// Hooks
export { useSignOut } from './hooks/useSignOut'

// Store — re-exported so consuming code only needs @/features/auth
export { useAuthStore } from '@/lib/stores/auth'

// Types
export type {
  AuthState,
  LoginFormValues,
  SignupFormValues,
  UsernameStatus,
} from './auth.types'
