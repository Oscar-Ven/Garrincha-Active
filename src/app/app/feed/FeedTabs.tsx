'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Rss, Users, PlusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FeedPostCard } from '@/components/player/feed-post-card'
import type { FeedPostWithRelations } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'all' | 'following'

interface FeedTabsProps {
  publicPosts: FeedPostWithRelations[]
  followingPosts: FeedPostWithRelations[]
  currentUserId?: string
  isAuthenticated: boolean
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyFeed({ tab }: { tab: Tab }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-800/50 px-6 py-16 text-center">
      {tab === 'following' ? (
        <>
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-700">
            <Users className="h-7 w-7 text-slate-400" />
          </div>
          <h3 className="mb-1 text-base font-semibold text-slate-200">
            Nothing from people you follow
          </h3>
          <p className="mb-6 max-w-xs text-sm text-slate-400">
            Follow other athletes to see their activities, badges, and achievements here.
          </p>
          <Link
            href="/app/activities/new"
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
          >
            <PlusCircle className="h-4 w-4" />
            Log an Activity
          </Link>
        </>
      ) : (
        <>
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-700">
            <Rss className="h-7 w-7 text-slate-400" />
          </div>
          <h3 className="mb-1 text-base font-semibold text-slate-200">
            The feed is quiet right now
          </h3>
          <p className="mb-6 max-w-xs text-sm text-slate-400">
            Be the first to log an activity and kick things off for the community.
          </p>
          <Link
            href="/app/activities/new"
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
          >
            <PlusCircle className="h-4 w-4" />
            Log an Activity
          </Link>
        </>
      )}
    </div>
  )
}

// ─── Post List ────────────────────────────────────────────────────────────────

function PostList({
  posts,
  currentUserId,
  tab,
}: {
  posts: FeedPostWithRelations[]
  currentUserId?: string
  tab: Tab
}) {
  if (posts.length === 0) {
    return <EmptyFeed tab={tab} />
  }

  return (
    <ul className="space-y-4">
      {posts.map((post) => (
        <li key={post.id}>
          <FeedPostCard
            post={post}
            currentUserId={currentUserId}
          />
        </li>
      ))}
    </ul>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FeedTabs({
  publicPosts,
  followingPosts,
  currentUserId,
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
      <div className="mb-5 flex gap-1 rounded-xl border border-slate-700 bg-slate-800 p-1">
        {tabs.map(({ id, label, disabled }) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              activeTab === id
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200',
              disabled && 'cursor-not-allowed opacity-40'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'all' ? (
        <PostList posts={publicPosts} currentUserId={currentUserId} tab="all" />
      ) : (
        <PostList posts={followingPosts} currentUserId={currentUserId} tab="following" />
      )}
    </div>
  )
}
