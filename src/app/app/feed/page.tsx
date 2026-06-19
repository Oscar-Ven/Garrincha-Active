import type { Metadata } from 'next'
import Link from 'next/link'
import { PlusCircle } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getPublicFeed, getFollowingFeed } from '@/services/feed'
import { FeedTabs } from './FeedTabs'
import type { FeedPostWithRelations } from '@/types'

export const metadata: Metadata = {
  title: 'Feed | Garrincha Active',
  description: 'See what the community has been up to',
}

// Revalidate at most every 60 seconds so new posts appear without a full deploy
export const revalidate = 60

export default async function FeedPage() {
  const user = await getCurrentUser()

  // Load public feed and (if logged in) following feed in parallel
  const [publicPosts, followingPosts] = await Promise.all([
    getPublicFeed({ limit: 20 }),
    user ? getFollowingFeed(user.id, { limit: 20 }) : Promise.resolve([]),
  ])

  return (
    <div className="mx-auto max-w-2xl">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Community Feed</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Activities, achievements, and milestones from the community
          </p>
        </div>

        {user && (
          <Link
            href="/app/activities/new"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Log Activity</span>
            <span className="sm:hidden">Log</span>
          </Link>
        )}
      </div>

      {/* Tabbed feed */}
      <FeedTabs
        publicPosts={publicPosts as unknown as FeedPostWithRelations[]}
        followingPosts={followingPosts as unknown as FeedPostWithRelations[]}
        currentUserId={user?.id}
        isAuthenticated={!!user}
      />
    </div>
  )
}
