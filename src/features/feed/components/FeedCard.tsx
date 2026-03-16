'use client'

import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { MapPin, Tag, ShieldCheck } from 'lucide-react'
import { FEED_TYPE_CONFIG } from '@/lib/constants'
import type { FeedPost } from '@/types'

interface Props {
  post: FeedPost
}

export function FeedCard({ post }: Props) {
  const config = FEED_TYPE_CONFIG[post.type] ?? { label: post.type, color: 'text-white/40 bg-white/5' }

  const authorHref =
    post.author_kind === 'artist'
      ? `/artist/${post.author_slug}`
      : post.author_kind === 'studio'
      ? `/studio/${post.author_id}`
      : `/convention/${post.author_id}`

  return (
    <div className="ink-card overflow-hidden flex flex-col gap-3 p-4">
      {/* Author row */}
      <Link href={authorHref} className="flex items-center gap-2 group">
        <div className="w-9 h-9 rounded-full bg-[#e63946]/20 border border-white/10 overflow-hidden flex items-center justify-center text-[#e63946] text-sm font-display flex-shrink-0">
          {post.author_avatar ? (
            <Image
              src={post.author_avatar}
              alt={post.author_name}
              width={36}
              height={36}
              className="w-full h-full object-cover"
            />
          ) : (
            post.author_name[0]?.toUpperCase()
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-white group-hover:text-[#e63946] transition-colors truncate">
              {post.author_name}
            </span>
            {post.author_kind === 'studio' && (
              <ShieldCheck size={12} className="text-blue-400 flex-shrink-0" />
            )}
          </div>
          <span className="text-[10px] text-white/30 capitalize">{post.author_kind}</span>
        </div>
        <span className="ml-auto text-[10px] text-white/25 flex-shrink-0">
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
        </span>
      </Link>

      {/* Type badge */}
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${config.color}`}>
          {config.label}
        </span>
        {post.price != null && (
          <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
            ${post.price}
          </span>
        )}
      </div>

      {/* Image */}
      {post.image_url && (
        <div className="rounded-lg overflow-hidden aspect-video bg-[#111114]">
          <Image
            src={post.image_url}
            alt={post.title}
            width={600}
            height={338}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-white leading-snug">{post.title}</h3>
        {post.body && (
          <p className="text-xs text-white/50 leading-relaxed line-clamp-3">{post.body}</p>
        )}
      </div>

      {/* Meta */}
      {(post.location || post.expires_at) && (
        <div className="flex items-center gap-3 text-[10px] text-white/30">
          {post.location && (
            <span className="flex items-center gap-1">
              <MapPin size={10} />
              {post.location}
            </span>
          )}
          {post.expires_at && (
            <span className="flex items-center gap-1">
              <Tag size={10} />
              Expires {formatDistanceToNow(new Date(post.expires_at), { addSuffix: true })}
            </span>
          )}
        </div>
      )}

      {/* CTA */}
      <Link
        href={authorHref}
        className="mt-auto text-xs text-[#e63946] hover:underline self-start"
      >
        View {post.author_kind === 'artist' ? 'artist' : post.author_kind === 'studio' ? 'studio' : 'event'} →
      </Link>
    </div>
  )
}
