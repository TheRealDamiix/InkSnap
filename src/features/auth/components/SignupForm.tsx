'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Palette, User, Check, X } from 'lucide-react'
import type { SignupFormValues, UsernameStatus } from '../auth.types'
import { NavLogo } from '@/components/ui/NavLogo'

// ─── Validation schema ────────────────────────────────────────────────────────

const signupSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  display_name: z.string().min(2, 'Name is required'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, and underscores only'),
  role: z.enum(['client', 'artist']),
})

// ─── Component ────────────────────────────────────────────────────────────────

export function SignupForm() {
  const searchParams = useSearchParams()
  const defaultRole = searchParams.get('role') === 'artist' ? 'artist' : 'client'

  const [error, setError] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: defaultRole },
  })

  const selectedRole = watch('role')
  const usernameValue = watch('username')

  // Debounced async username availability check
  useEffect(() => {
    if (
      !usernameValue ||
      usernameValue.length < 3 ||
      !/^[a-zA-Z0-9_]+$/.test(usernameValue)
    ) {
      setUsernameStatus('idle')
      return
    }

    setUsernameStatus('checking')
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .ilike('username', usernameValue)
        .maybeSingle()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 500)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [usernameValue])

  const onSubmit = async (data: SignupFormValues) => {
    if (usernameStatus === 'taken') {
      setError('That username is already taken. Please choose another.')
      return
    }
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          role: data.role,
          username: data.username,
          display_name: data.display_name,
        },
      },
    })

    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('rate limit') || msg.includes('email rate')) {
        setError(
          'Too many sign-up attempts. Please wait a few minutes and try again, or disable email confirmation in your Supabase project (Auth → Settings → Disable "Confirm email").'
        )
      } else {
        setError(error.message)
      }
      return
    }

    // New signups are always remembered
    localStorage.setItem('inksnap_remember', '1')
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="flex justify-center mb-10">
          <NavLogo />
        </Link>

        <div className="ink-card p-8">
          <h1 className="font-display text-3xl text-white tracking-wide mb-1">JOIN TATSY</h1>
          <p className="text-white/40 text-sm mb-8">Create your free account</p>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-7">
            {[
              { value: 'client', label: 'Client', desc: 'Find & book artists', icon: <User size={20} />, activeClass: 'border-[#e63946]/60 bg-[#e63946]/10', activeIcon: 'text-[#e63946]' },
              { value: 'artist', label: 'Artist', desc: 'Showcase your work', icon: <Palette size={20} />, activeClass: 'border-[#f5c518]/60 bg-[#f5c518]/10', activeIcon: 'text-[#f5c518]' },
            ].map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setValue('role', r.value as 'client' | 'artist')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedRole === r.value
                    ? r.activeClass
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className={`mb-2 ${selectedRole === r.value ? r.activeIcon : 'text-white/40'}`}>
                  {r.icon}
                </div>
                <div className="text-sm font-medium text-white">{r.label}</div>
                <div className="text-xs text-white/40">{r.desc}</div>
              </button>
            ))}
          </div>
          <input type="hidden" {...register('role')} />

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name + Username */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Name</label>
                <input
                  {...register('display_name')}
                  placeholder="Jane Doe"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 transition-colors text-sm"
                />
                {errors.display_name && (
                  <p className="text-red-400 text-xs mt-1">{errors.display_name.message}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Username</label>
                <div className="relative">
                  <input
                    {...register('username')}
                    placeholder="jane_ink"
                    className={`w-full bg-white/5 border rounded-lg px-3 py-2.5 pr-8 text-white placeholder:text-white/20 focus:outline-none transition-colors text-sm ${
                      usernameStatus === 'taken'
                        ? 'border-red-500/50 focus:border-red-500/70'
                        : usernameStatus === 'available'
                        ? 'border-emerald-500/50 focus:border-emerald-500/70'
                        : 'border-white/10 focus:border-[#e63946]/50'
                    }`}
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    {usernameStatus === 'checking' && (
                      <Loader2 size={14} className="animate-spin text-white/30" />
                    )}
                    {usernameStatus === 'available' && <Check size={14} className="text-emerald-400" />}
                    {usernameStatus === 'taken' && <X size={14} className="text-red-400" />}
                  </div>
                </div>
                {errors.username && (
                  <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>
                )}
                {!errors.username && usernameStatus === 'taken' && (
                  <p className="text-red-400 text-xs mt-1">Username already taken</p>
                )}
                {!errors.username && usernameStatus === 'available' && (
                  <p className="text-emerald-400 text-xs mt-1">Username available</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 transition-colors text-sm"
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Password</label>
              <input
                {...register('password')}
                type="password"
                placeholder="Min 8 characters"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 transition-colors text-sm"
              />
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || usernameStatus === 'taken' || usernameStatus === 'checking'}
              className="w-full bg-[#e63946] hover:bg-[#d42f3b] disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
              Create Account
            </button>
          </form>

          <p className="text-center text-sm text-white/30 mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-[#e63946] hover:text-[#ff5a65] transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
