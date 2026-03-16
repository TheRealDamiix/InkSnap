'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { FeedPost } from '@/types'

const PAGE_SIZE = 30

async function fetchFeedPage(pageParam: number): Promise<FeedPost[]> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_for_you_feed', {
    p_limit: PAGE_SIZE,
    p_offset: pageParam * PAGE_SIZE,
  })
  if (error) throw error
  return (data ?? []) as FeedPost[]
}

export function useForYouFeed() {
  return useInfiniteQuery({
    queryKey: ['for-you-feed'],
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
  })
}
