'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or username required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

function LoginForm() {
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setError('')
    const supabase = createClient()

    let email = data.identifier.trim()

    // If not an email address, look up by username
    if (!email.includes('@')) {
      const { data: result, error: rpcErr } = await supabase
        .rpc('get_email_for_login', { p_username: email })
      if (rpcErr || !result) {
        setError('No account found with that username.')
        return
      }
      email = result as string
    }

    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: data.password })
    if (authErr) { setError(authErr.message); return }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="font-display text-3xl text-white tracking-wider block mb-10 text-center">INKSNAP</Link>
        <div className="ink-card p-8">
          <h1 className="font-display text-3xl text-white tracking-wide mb-1">WELCOME BACK</h1>
          <p className="text-white/40 text-sm mb-8">Sign in to your account</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Email or Username</label>
              <input
                {...register('identifier')}
                type="text"
                placeholder="you@example.com or jane_ink"
                autoComplete="username"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 transition-colors text-sm"
              />
              {errors.identifier && <p className="text-red-400 text-xs mt-1">{errors.identifier.message}</p>}
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 pr-10 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 transition-colors text-sm"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#e63946] hover:bg-[#d42f3b] disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
              Sign In
            </button>
          </form>

          <p className="text-center text-sm text-white/30 mt-6">
            No account?{' '}
            <Link href="/auth/signup" className="text-[#e63946] hover:text-[#ff5a65] transition-colors">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
