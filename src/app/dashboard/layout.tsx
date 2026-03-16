'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/stores/auth'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Search, MessageSquare, Calendar,
  User, LogOut, Zap, Bookmark, Images, Menu, X, Building2, CalendarDays,
} from 'lucide-react'
import { UnreadBadge } from '@/components/messaging/unread-badge'
import { RightRail } from '@/components/dashboard/RightRail'
import { NavLogo } from '@/components/ui/NavLogo'

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
        <NavLogo className="opacity-20 animate-pulse" />
      </div>
    )
  }

  if (!profile) return null

  const isArtist = profile.role === 'artist'

  const artistNav = [
    { href: '/dashboard',                label: 'Home',        icon: <LayoutDashboard size={22} />, exact: true },
    { href: '/dashboard/bookings',       label: 'Bookings',    icon: <Calendar size={22} /> },
    { href: '/dashboard/portfolio',      label: 'Portfolio',   icon: <Images size={22} /> },
    { href: '/dashboard/promotions',     label: 'Promotions',  icon: <Zap size={22} /> },
    { href: '/dashboard/studio',         label: 'My Studio',   icon: <Building2 size={22} /> },
    { href: '/dashboard/conventions',    label: 'Conventions', icon: <CalendarDays size={22} /> },
    { href: '/messages',                 label: 'Messages',    icon: <MessageSquare size={22} />, badge: true },
    { href: '/search',                   label: 'Discover',    icon: <Search size={22} /> },
    { href: '/dashboard/profile',        label: 'Profile',     icon: <User size={22} /> },
  ]

  const clientNav = [
    { href: '/dashboard',                label: 'Feed',          icon: <LayoutDashboard size={22} />, exact: true },
    { href: '/dashboard/bookings',       label: 'My Bookings',   icon: <Calendar size={22} /> },
    { href: '/dashboard/saved',          label: 'Saved Artists', icon: <Bookmark size={22} /> },
    { href: '/dashboard/conventions',    label: 'Conventions',   icon: <CalendarDays size={22} /> },
    { href: '/messages',                 label: 'Messages',      icon: <MessageSquare size={22} />, badge: true },
    { href: '/search',                   label: 'Discover',      icon: <Search size={22} /> },
    { href: '/dashboard/profile',        label: 'Profile',       icon: <User size={22} /> },
  ]

  const navItems = isArtist ? artistNav : clientNav

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    localStorage.removeItem('inksnap_remember')
    sessionStorage.removeItem('inksnap_session')
    window.location.href = '/'
  }

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  // Left rail nav link — shared between desktop and mobile
  const NavLink = ({ item, onClick }: { item: typeof navItems[0]; onClick?: () => void }) => {
    const active = isActive(item.href, item.exact)
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={`relative flex items-center gap-4 px-4 py-3 rounded-full text-[15px] mb-0.5 transition-all group ${
          active
            ? 'font-bold text-white'
            : 'font-normal text-white/60 hover:text-white hover:bg-white/[0.06]'
        }`}
      >
        {/* Red active bar */}
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#e63946] rounded-r-full" />
        )}
        <span className={`transition-colors ${active ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>
          {item.icon}
        </span>
        <span>{item.label}</span>
        {item.badge && <UnreadBadge profileId={profile.id} />}
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      <div className="flex max-w-[1400px] mx-auto">

        {/* ── Left Rail (desktop) ───────────────────────────────── */}
        <div className="hidden lg:flex flex-col w-[270px] shrink-0 sticky top-0 h-screen border-r border-white/[0.06]">
          {/* Logo */}
          <div className="px-6 pt-7 pb-5">
            <Link href="/dashboard">
              <NavLogo />
            </Link>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>

          {/* Profile chip + Sign out */}
          <div className="px-3 py-4 border-t border-white/[0.06] space-y-1">
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-3 px-4 py-3 rounded-full hover:bg-white/[0.06] transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-[#e63946]/20 flex items-center justify-center text-[#e63946] font-display text-xl shrink-0 overflow-hidden">
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  : profile.display_name[0].toUpperCase()
                }
              </div>
              <div className="overflow-hidden flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{profile.display_name}</div>
                <div className="text-xs text-white/40 truncate">@{profile.username}</div>
              </div>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-4 px-4 py-3 rounded-full text-[15px] text-white/40 hover:text-white hover:bg-white/[0.06] w-full transition-all"
            >
              <LogOut size={22} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* ── Center Column ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0 border-r border-white/[0.06] min-h-screen">

          {/* Mobile top bar */}
          <div className="lg:hidden sticky top-0 z-30 bg-[#0a0a0b]/80 backdrop-blur-md border-b border-white/[0.06] flex items-center justify-between px-4 h-14">
            <Link href="/dashboard">
              <NavLogo />
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="text-white/60 hover:text-white p-1 transition-colors"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {/* Mobile sidebar overlay */}
          {mobileOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex">
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setMobileOpen(false)}
              />
              <div className="relative w-[280px] bg-[#0a0a0b] border-r border-white/[0.06] flex flex-col">
                <div className="px-6 pt-6 pb-4 flex items-center justify-between">
                  <NavLogo />
                  <button onClick={() => setMobileOpen(false)} className="text-white/40 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <nav className="flex-1 px-3 overflow-y-auto">
                  {navItems.map((item) => (
                    <NavLink key={item.href} item={item} onClick={() => setMobileOpen(false)} />
                  ))}
                </nav>
                <div className="px-3 py-4 border-t border-white/[0.06] space-y-1">
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-full hover:bg-white/[0.06]"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#e63946]/20 flex items-center justify-center text-[#e63946] font-display text-xl overflow-hidden">
                      {profile.avatar_url
                        ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        : profile.display_name[0].toUpperCase()
                      }
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-sm font-semibold text-white truncate">{profile.display_name}</div>
                      <div className="text-xs text-white/40 truncate">@{profile.username}</div>
                    </div>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-4 px-4 py-3 rounded-full text-white/40 hover:text-white w-full transition-colors"
                  >
                    <LogOut size={20} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Page content */}
          <main className="pb-20 lg:pb-0 page-enter">
            {children}
          </main>

          {/* Mobile bottom tab bar */}
          <div className="lg:hidden fixed bottom-0 inset-x-0 bg-[#0a0a0b]/90 backdrop-blur-md border-t border-white/[0.06] z-30 flex items-center justify-around px-1 h-16">
            {navItems.slice(0, 5).map((item) => {
              const active = isActive(item.href, item.exact)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center flex-1 h-full gap-1 relative transition-colors ${
                    active ? 'text-white' : 'text-white/30'
                  }`}
                >
                  {item.icon}
                  {item.badge && <UnreadBadge profileId={profile.id} />}
                  {active && (
                    <span className="absolute bottom-0 inset-x-1/4 h-[2px] bg-[#e63946] rounded-t-full" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        {/* ── Right Rail (desktop xl+) ──────────────────────────── */}
        <div className="hidden xl:block w-[300px] shrink-0">
          <div className="sticky top-0 h-screen overflow-y-auto py-4 px-3">
            <RightRail profile={profile} />
          </div>
        </div>

      </div>
    </div>
  )
}
