'use client'

import { useEffect, useRef } from 'react'
import { useForYouFeed } from '../hooks/useForYouFeed'
import { FeedCard } from './FeedCard'
import type { PromotionType } from '@/types'

const FILTER_TABS: { label: string; value: PromotionType | 'all' }[] = [
  { label: 'All',        value: 'all' },
  { label: 'Flash Deals', value: 'flash_deal' },
  { label: 'Updates',    value: 'update' },
  { label: 'Conventions', value: 'convention' },
  { label: 'Studio Posts', value: 'studio_post' },
]

interface Props {
  /** If provided, show a tab filter bar */
  showFilters?: boolean
  activeFilter?: PromotionType | 'all'
  onFilterChange?: (f: PromotionType | 'all') => void
}

export function ForYouFeed({ showFilters, activeFilter = 'all', onFilterChange }: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useForYouFeed()
  const sentinel = useRef<HTMLDivElement>(null)

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const allPosts = data?.pages.flat() ?? []
  const filtered =
    activeFilter === 'all' ? allPosts : allPosts.filter((p) => p.type === activeFilter)

  return (
    <div className="flex flex-col gap-4">
      {/* Filter tabs */}
      {showFilters && (
        <div className="flex gap-2 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onFilterChange?.(tab.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeFilter === tab.value
                  ? 'bg-[#e63946] text-white'
                  : 'bg-white/5 text-white/40 hover:text-white/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="ink-card p-4 flex flex-col gap-3 animate-pulse"
            >
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-white/5" />
                <div className="flex flex-col gap-1 flex-1">
                  <div className="h-3 w-28 bg-white/5 rounded" />
                  <div className="h-2 w-14 bg-white/5 rounded" />
                </div>
              </div>
              <div className="h-4 w-3/4 bg-white/5 rounded" />
              <div className="h-3 w-full bg-white/5 rounded" />
              <div className="h-3 w-2/3 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Posts */}
      {!isLoading && filtered.length === 0 && (
        <div className="ink-card p-8 flex flex-col items-center gap-2 text-center">
          <p className="text-white/40 text-sm">Nothing here yet.</p>
          <p className="text-white/25 text-xs">
            Follow artists, studios, and conventions to see their posts here.
          </p>
        </div>
      )}

      {filtered.map((post) => (
        <FeedCard key={post.id} post={post} />
      ))}

      {/* Infinite scroll sentinel */}
      <div ref={sentinel} />

      {isFetchingNextPage && (
        <p className="text-xs text-white/25 text-center py-2">Loading more…</p>
      )}
    </div>
  )
}
