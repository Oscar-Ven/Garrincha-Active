'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import StitchFeedCard from '@/components/stitch/feed-post-card'
import type { FeedPostWithRelations } from '@/types'

type Tab = 'all' | 'following'

interface FeedTabsProps {
  publicPosts: FeedPostWithRelations[]
  followingPosts: FeedPostWithRelations[]
  currentUserId?: string
  isAuthenticated: boolean
}

function EmptyFeed({ tab }: { tab: Tab }) {
  return (
    <div className="glass-card rounded-xl p-md py-12 flex flex-col items-center text-center">
      <span
        className="material-symbols-outlined text-on-surface-variant mb-sm"
        style={{ fontSize: '40px' }}
      >
        {tab === 'following' ? 'group' : 'rss_feed'}
      </span>
      <h3 className="text-body-md font-bold text-white mb-xs">
        {tab === 'following' ? 'Nothing from people you follow' : 'The feed is quiet right now'}
      </h3>
      <p className="text-label-caps text-on-surface-variant max-w-xs mb-md">
        {tab === 'following'
          ? 'Follow other athletes to see their activities here.'
          : 'Be the first to log a match and kick things off.'}
      </p>
      <Link
        href="/app/matches/new"
        className="bg-primary-fixed text-on-primary-fixed px-md py-xs rounded-full text-label-caps font-bold hover:opacity-90 transition-opacity"
      >
        Start a Match
      </Link>
    </div>
  )
}

function PostList({
  posts,
  tab,
}: {
  posts: FeedPostWithRelations[]
  tab: Tab
}) {
  if (posts.length === 0) return <EmptyFeed tab={tab} />

  return (
    <ul className="space-y-md">
      {posts.map((post) => (
        <li key={post.id}>
          <StitchFeedCard post={post} />
        </li>
      ))}
    </ul>
  )
}

export function FeedTabs({
  publicPosts,
  followingPosts,
  isAuthenticated,
}: FeedTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('all')

  const tabs: { id: Tab; label: string; disabled?: boolean }[] = [
    { id: 'all', label: 'All Activity' },
    { id: 'following', label: 'Following', disabled: !isAuthenticated },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-md flex gap-xs glass-card rounded-xl p-xs">
        {tabs.map(({ id, label, disabled }) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex-1 rounded-lg px-md py-xs text-label-caps font-bold transition-colors',
              activeTab === id
                ? 'bg-primary-fixed text-on-primary-fixed'
                : 'text-on-surface-variant hover:text-on-surface',
              disabled && 'cursor-not-allowed opacity-40',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'all' ? (
        <PostList posts={publicPosts} tab="all" />
      ) : (
        <PostList posts={followingPosts} tab="following" />
      )}
    </div>
  )
}
