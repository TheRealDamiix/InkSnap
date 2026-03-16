'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Search, MessageSquare, Calendar,
  Bookmark, Building2, CalendarDays,
} from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth'
import { UnreadBadge } from '@/components/messaging/unread-badge'

const artistNav = [
  { href: '/dashboard',             icon: <LayoutDashboard size={22} />, exact: true },
  { href: '/dashboard/bookings',    icon: <Calendar size={22} /> },
  { href: '/dashboard/conventions', icon: <CalendarDays size={22} /> },
  { href: '/messages',              icon: <MessageSquare size={22} />, badge: true },
  { href: '/search',                icon: <Search size={22} /> },
]

const clientNav = [
  { href: '/dashboard',             icon: <LayoutDashboard size={22} />, exact: true },
  { href: '/dashboard/bookings',    icon: <Calendar size={22} /> },
  { href: '/dashboard/saved',       icon: <Bookmark size={22} /> },
  { href: '/messages',              icon: <MessageSquare size={22} />, badge: true },
  { href: '/search',                icon: <Search size={22} /> },
]

export function MobileBottomNav() {
  const { profile } = useAuthStore()
  const pathname = usePathname()

  if (!profile) return null

  const navItems = profile.role === 'artist' ? artistNav : clientNav

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 bg-[#0a0a0b]/90 backdrop-blur-md border-t border-white/[0.06] z-30 flex items-center justify-around px-1 h-16">
      {navItems.map((item) => {
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
  )
}
