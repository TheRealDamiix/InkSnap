'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Search, MessageSquare, Calendar,
  User, LogOut, Zap, Bookmark, Star, Menu, X
} from 'lucide-react'
import { useState } from 'react'
import { UnreadBadge } from '@/components/messaging/unread-badge'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!loading && !profile) router.push('/auth/login')
  }, [loading, profile, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="font-display text-3xl text-white/20 tracking-wider animate-pulse">INKSNAP</div>
      </div>
    )
  }

  if (!profile) return null

  const isArtist = profile.role === 'artist'

  const artistNav = [
    { href: '/dashboard', label: 'Overview', icon: <LayoutDashboard size={18} /> },
    { href: '/dashboard/portfolio', label: 'Portfolio', icon: <Star size={18} /> },
    { href: '/dashboard/bookings', label: 'Bookings', icon: <Calendar size={18} /> },
    { href: '/dashboard/promotions', label: 'Promotions', icon: <Zap size={18} /> },
    { href: '/messages', label: 'Messages', icon: <MessageSquare size={18} />, badge: true },
    { href: '/search', label: 'Discover', icon: <Search size={18} /> },
    { href: '/dashboard/profile', label: 'Profile', icon: <User size={18} /> },
  ]

  const clientNav = [
    { href: '/dashboard', label: 'Feed', icon: <LayoutDashboard size={18} /> },
    { href: '/dashboard/bookings', label: 'My Bookings', icon: <Calendar size={18} /> },
    { href: '/dashboard/saved', label: 'Saved Artists', icon: <Bookmark size={18} /> },
    { href: '/messages', label: 'Messages', icon: <MessageSquare size={18} />, badge: true },
    { href: '/search', label: 'Discover', icon: <Search size={18} /> },
    { href: '/dashboard/profile', label: 'Profile', icon: <User size={18} /> },
  ]

  const navItems = isArtist ? artistNav : clientNav

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    localStorage.removeItem('inksnap_remember')
    sessionStorage.removeItem('inksnap_session')
    window.location.href = '/'
  }

  const Sidebar = () => (
    <aside className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/5">
        <Link href="/dashboard" className="font-display text-2xl text-white tracking-wider">INKSNAP</Link>
        <div className="mt-1 text-xs text-white/30 uppercase tracking-widest">{isArtist ? 'Artist Dashboard' : 'Client Dashboard'}</div>
      </div>

      {/* Profile summary */}
      <div className="px-4 py-4 border-b border-white/5">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5">
          <div className="w-9 h-9 rounded-full bg-[#e63946]/20 flex items-center justify-center text-[#e63946] font-display text-lg flex-shrink-0">
            {profile.display_name[0].toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <div className="text-sm font-medium text-white truncate">{profile.display_name}</div>
            <div className="text-xs text-white/30 truncate">@{profile.username}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative ${
                isActive
                  ? 'bg-[#e63946]/15 text-[#e63946] font-medium'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.icon}
              {item.label}
              {item.badge && <UnreadBadge profileId={profile.id} />}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-white/5">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/30 hover:text-white/60 hover:bg-white/5 w-full transition-all"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-64 flex-col bg-[#111114] border-r border-white/5 fixed inset-y-0 left-0 z-40">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 bg-[#111114] border-r border-white/5 flex flex-col">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#111114] sticky top-0 z-30">
          <span className="font-display text-xl text-white tracking-wider">INKSNAP</span>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white/60 hover:text-white p-1">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <main className="flex-1 p-6 lg:p-8 page-enter">
          {children}
        </main>
      </div>
    </div>
  )
}
