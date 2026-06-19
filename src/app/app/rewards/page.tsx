import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getRewards } from '@/services/rewards'
import { RewardCard } from '@/components/player/reward-card'
import { CategoryTabs } from './CategoryTabs'
import { RewardCategory } from '@/generated/prisma'

export const metadata: Metadata = {
  title: 'Rewards | Garrincha Active',
  description:
    'Browse the rewards catalog. Redeem your points for discounts, merchandise, free sessions, and more.',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCategory(raw: string | undefined): RewardCategory | undefined {
  if (!raw || raw === 'ALL') return undefined
  if (Object.values(RewardCategory).includes(raw as RewardCategory)) {
    return raw as RewardCategory
  }
  return undefined
}

// ─── Points Banner ─────────────────────────────────────────────────────────────

function PointsBanner({
  points,
  redemptionCount,
}: {
  points: number
  redemptionCount: number
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-950/60 via-slate-900 to-slate-900 p-6">
      {/* Decorative glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-yellow-500/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Points display */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-yellow-500/20 border border-yellow-500/30">
            <svg
              className="h-7 w-7 text-yellow-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-yellow-500/80 uppercase tracking-widest">
              Your Points Balance
            </p>
            <p className="text-4xl font-extrabold text-yellow-400 leading-tight tabular-nums">
              {points.toLocaleString()}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {redemptionCount === 0
                ? 'No redemptions yet'
                : `${redemptionCount} reward${redemptionCount === 1 ? '' : 's'} redeemed`}
            </p>
          </div>
        </div>

        {/* My Redemptions CTA */}
        <Link
          href="/app/wallet"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-5 py-2.5 text-sm font-semibold text-yellow-300 transition-all duration-150 hover:bg-yellow-500/20 hover:border-yellow-500/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
        >
          <svg
            className="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
            />
          </svg>
          My Redemptions
        </Link>
      </div>
    </div>
  )
}

// ─── Catalog Stats ─────────────────────────────────────────────────────────────

function CatalogStats({
  total,
  category,
  shown,
}: {
  total: number
  category: RewardCategory | undefined
  shown: number
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-sm text-slate-400">
        {category
          ? `${shown} reward${shown === 1 ? '' : 's'} in this category`
          : `${total} reward${total === 1 ? '' : 's'} available`}
      </span>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-700 bg-slate-800/40 px-6 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-700">
        <svg
          className="h-7 w-7 text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
          />
        </svg>
      </div>
      <div>
        <p className="text-base font-semibold text-slate-200">
          {hasFilter ? 'No rewards in this category' : 'No rewards available'}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {hasFilter
            ? 'Try the "All" tab to see rewards across all categories.'
            : 'Check back soon — new rewards are added regularly.'}
        </p>
      </div>
      {hasFilter && (
        <Link
          href="/app/rewards"
          className="mt-1 rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-600"
        >
          View all rewards
        </Link>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface RewardsPageProps {
  searchParams: Promise<{ category?: string }>
}

export default async function RewardsPage({ searchParams }: RewardsPageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const resolvedParams = await searchParams
  const activeCategory = parseCategory(resolvedParams.category)

  // Parallel data fetching
  const [playerProfile, allActiveRewards, filteredRewards, redemptionCount] =
    await Promise.all([
      prisma.playerProfile.findUnique({
        where: { userId: user.id },
        select: { totalPoints: true },
      }),
      // All active rewards for total count (no category filter)
      getRewards({ activeOnly: true }),
      // Filtered rewards for the grid
      getRewards({
        activeOnly: true,
        ...(activeCategory ? { category: activeCategory } : {}),
      }),
      // How many redemptions the user has
      prisma.rewardRedemption.count({
        where: { userId: user.id },
      }),
    ])

  const totalPoints = playerProfile?.totalPoints ?? 0

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Rewards Catalog
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Redeem your hard-earned points for exclusive rewards.
        </p>
      </div>

      {/* ── Points Banner ── */}
      <PointsBanner points={totalPoints} redemptionCount={redemptionCount} />

      {/* ── Category Filter Tabs ── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Filter by category
        </p>
        <Suspense fallback={null}>
          <CategoryTabs />
        </Suspense>
      </div>

      {/* ── Catalog Stats ── */}
      <CatalogStats
        total={allActiveRewards.length}
        category={activeCategory}
        shown={filteredRewards.length}
      />

      {/* ── Rewards Grid ── */}
      {filteredRewards.length === 0 ? (
        <EmptyState hasFilter={activeCategory !== undefined} />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={{
                id: reward.id,
                title: reward.title,
                description: reward.description,
                pointsCost: reward.pointsCost,
                category: reward.category,
                stock: reward.stock,
                imageUrl: reward.imageUrl,
                sponsor: reward.sponsor,
                center: reward.center,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
