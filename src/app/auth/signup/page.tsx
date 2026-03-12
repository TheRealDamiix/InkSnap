'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Palette, User } from 'lucide-react'

const signupSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  display_name: z.string().min(2, 'Name is required'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers, and underscores only'),
  role: z.enum(['client', 'artist']),
})

type SignupForm = z.infer<typeof signupSchema>

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultRole = searchParams.get('role') === 'artist' ? 'artist' : 'client'
  const [error, setError] = useState('')

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: defaultRole },
  })

  const selectedRole = watch('role')

  const onSubmit = async (data: SignupForm) => {
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
    if (error) { setError(error.message); return }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="font-display text-3xl text-white tracking-wider block mb-10 text-center">INKSNAP</Link>
        <div className="ink-card p-8">
          <h1 className="font-display text-3xl text-white tracking-wide mb-1">JOIN INKSNAP</h1>
          <p className="text-white/40 text-sm mb-8">Create your free account</p>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-7">
            {[
              { value: 'client', label: 'Client', desc: 'Find & book artists', icon: <User size={20} /> },
              { value: 'artist', label: 'Artist', desc: 'Showcase your work', icon: <Palette size={20} /> },
            ].map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setValue('role', r.value as 'client' | 'artist')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedRole === r.value
                    ? 'border-[#e63946]/60 bg-[#e63946]/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className={`mb-2 ${selectedRole === r.value ? 'text-[#e63946]' : 'text-white/40'}`}>{r.icon}</div>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Name</label>
                <input
                  {...register('display_name')}
                  placeholder="Jane Doe"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 transition-colors text-sm"
                />
                {errors.display_name && <p className="text-red-400 text-xs mt-1">{errors.display_name.message}</p>}
              </div>
              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Username</label>
                <input
                  {...register('username')}
                  placeholder="jane_ink"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 transition-colors text-sm"
                />
                {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>}
              </div>
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 transition-colors text-sm"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-widest block mb-2">Password</label>
              <input
                {...register('password')}
                type="password"
                placeholder="Min 8 characters"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-[#e63946]/50 transition-colors text-sm"
              />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#e63946] hover:bg-[#d42f3b] disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
              Create Account
            </button>
          </form>

          <p className="text-center text-sm text-white/30 mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-[#e63946] hover:text-[#ff5a65] transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
