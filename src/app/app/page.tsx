import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPublicFeed } from '@/services/feed'
import { getLevelThreshold } from '@/lib/utils'
import StitchFeedCard from '@/components/stitch/feed-post-card'
import { Level } from '@/generated/prisma'
import type { FeedPostWithRelations } from '@/types'

export const revalidate = 60

const LEVEL_NEXT: Record<Level, number> = {
  BRONZE: 500,
  SILVER: 2000,
  GOLD: 5000,
  ELITE: 5000,
}

const LEVEL_LABEL: Record<Level, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Silver',
  GOLD: 'Gold',
  ELITE: 'Elite',
}

function xpPercent(level: Level, lifetimePoints: number): number {
  if (level === Level.ELITE) return 100
  const floor = getLevelThreshold(level)
  const ceil = LEVEL_NEXT[level]
  return Math.min(100, Math.max(0, Math.round(((lifetimePoints - floor) / (ceil - floor)) * 100)))
}

export default async function AppHomePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const [profile, recentPosts, activeMatchCount] = await Promise.all([
    prisma.playerProfile.findUnique({
      where: { userId: user.id },
      select: { level: true, totalPoints: true, lifetimePoints: true },
    }),
    getPublicFeed({ limit: 5 }),
    prisma.matchResult.count({
      where: {
        participants: { some: { userId: user.id } },
        status: 'PENDING',
      },
    }),
  ])

  const level = profile?.level ?? Level.BRONZE
  const lifetimePoints = profile?.lifetimePoints ?? 0
  const totalPoints = profile?.totalPoints ?? 0
  const xp = xpPercent(level, lifetimePoints)
  const levelLabel = LEVEL_LABEL[level]
  const firstName = user.name.split(' ')[0]

  return (
    <div className="max-w-2xl mx-auto space-y-lg">
      {/* Hero */}
      <div className="relative w-full h-48 rounded-xl overflow-hidden bg-linear-to-br from-surface-container-high to-surface-container-highest">
        <div className="absolute inset-0 bg-linear-to-t from-surface-container-lowest/90 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-md">
          <p className="text-label-caps text-primary-fixed mb-1">Ready for action</p>
          <h2 className="text-headline-md text-white">Welcome back, {firstName}</h2>
        </div>
      </div>

      {/* Quick Stats Bento */}
      <section className="grid grid-cols-2 gap-md">
        {/* Performance — full width */}
        <div className="glass-card p-md rounded-xl col-span-2 flex justify-between items-center overflow-hidden relative">
          <div className="z-10">
            <p className="text-label-caps text-on-surface-variant">Current Performance</p>
            <div className="flex items-baseline gap-1 mt-xs">
              <span className="text-stats-xl text-primary-fixed">{levelLabel}</span>
            </div>
          </div>
          <div className="z-10 flex flex-col items-end gap-1">
            <div className="h-10 w-28 bg-surface-container-high rounded-full overflow-hidden relative">
              <div
                className="absolute inset-y-0 left-0 bg-primary-fixed/20 rounded-full transition-all"
                style={{ width: `${xp}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-label-caps text-primary-fixed">
                XP {xp}%
              </div>
            </div>
            <p className="text-label-caps text-on-surface-variant">
              {lifetimePoints.toLocaleString()} pts lifetime
            </p>
          </div>
        </div>

        {/* Active Matches */}
        <div className="glass-card p-md rounded-xl">
          <p className="text-label-caps text-on-surface-variant mb-xs">Active Matches</p>
          <div className="flex items-center gap-2">
            <span className="text-headline-md text-white">{activeMatchCount}</span>
            {activeMatchCount > 0 && (
              <div className="h-2 w-2 rounded-full bg-primary-fixed pulse-green" />
            )}
          </div>
        </div>

        {/* Community XP */}
        <div className="glass-card p-md rounded-xl">
          <p className="text-label-caps text-on-surface-variant mb-xs">Community XP</p>
          <div className="flex items-center gap-2">
            <span className="text-headline-md text-secondary">
              {totalPoints.toLocaleString()}
            </span>
          </div>
        </div>
      </section>

      {/* Action Shortcuts */}
      <div className="grid grid-cols-3 gap-sm">
        <Link
          href="/app/discover"
          className="glass-card rounded-xl p-sm flex flex-col items-center gap-xs text-center hover:bg-surface-container-high transition-colors active:scale-95"
        >
          <span
            className="material-symbols-outlined text-primary-fixed-dim"
            style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}
          >
            person_search
          </span>
          <span className="text-label-caps text-on-surface-variant">Find Partner</span>
        </Link>
        <Link
          href="/app/matches"
          className="glass-card rounded-xl p-sm flex flex-col items-center gap-xs text-center hover:bg-surface-container-high transition-colors active:scale-95"
        >
          <span
            className="material-symbols-outlined text-primary-fixed-dim"
            style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}
          >
            sports_kabaddi
          </span>
          <span className="text-label-caps text-on-surface-variant">My Matches</span>
        </Link>
        <Link
          href="/app/feed"
          className="glass-card rounded-xl p-sm flex flex-col items-center gap-xs text-center hover:bg-surface-container-high transition-colors active:scale-95"
        >
          <span
            className="material-symbols-outlined text-primary-fixed-dim"
            style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}
          >
            groups
          </span>
          <span className="text-label-caps text-on-surface-variant">Community</span>
        </Link>
      </div>

      {/* Recent Activity */}
      <section className="space-y-md">
        <div className="flex justify-between items-center">
          <h3 className="text-headline-md text-white">Recent Activity</h3>
          <Link
            href="/app/feed"
            className="text-label-caps text-primary-fixed tracking-widest hover:opacity-80"
          >
            View All
          </Link>
        </div>

        {recentPosts.length === 0 ? (
          <div className="glass-card rounded-xl p-md py-10 text-center">
            <span
              className="material-symbols-outlined text-on-surface-variant mb-sm block"
              style={{ fontSize: '40px' }}
            >
              rss_feed
            </span>
            <p className="text-body-md text-on-surface-variant">No activity yet.</p>
            <Link
              href="/app/matches/new"
              className="text-label-caps text-primary-fixed mt-sm inline-block hover:opacity-80"
            >
              Start your first match →
            </Link>
          </div>
        ) : (
          <div className="space-y-md">
            {(recentPosts as unknown as FeedPostWithRelations[]).map((post) => (
              <StitchFeedCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>

      {/* START MATCH FAB */}
      <Link
        href="/app/matches/new"
        className="fixed bottom-24 right-margin-mobile z-40 bg-primary-fixed text-on-primary-fixed px-lg py-sm rounded-full flex items-center gap-2 font-bold action-glow hover:scale-105 active:scale-95 transition-all"
      >
        <span
          className="material-symbols-outlined"
          style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}
        >
          add_circle
        </span>
        <span>START MATCH</span>
      </Link>
    </div>
  )
}
