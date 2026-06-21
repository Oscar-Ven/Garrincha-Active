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
    <div className="relative overflow-hidden glass-card rounded-xl border border-[#FFD700]/20 p-md bg-linear-to-br from-[#FFD700]/5 to-transparent">
      {/* Decorative glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#FFD700]/5 blur-3xl"
      />

      <div className="relative flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
        {/* Points display */}
        <div className="flex items-center gap-md">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20">
            <span
              className="material-symbols-outlined text-[#FFD700]"
              style={{ fontSize: '28px', fontVariationSettings: "'FILL' 1" }}
            >
              stars
            </span>
          </div>
          <div>
            <p className="text-label-caps text-[#FFD700]/80">Your Points Balance</p>
            <p className="text-stats-xl font-extrabold text-[#FFD700] leading-tight tabular-nums">
              {points.toLocaleString()}
            </p>
            <p className="text-label-caps text-on-surface-variant mt-0.5">
              {redemptionCount === 0
                ? 'No redemptions yet'
                : `${redemptionCount} reward${redemptionCount === 1 ? '' : 's'} redeemed`}
            </p>
          </div>
        </div>

        {/* My Redemptions CTA */}
        <Link
          href="/app/wallet"
          className="inline-flex shrink-0 items-center gap-sm glass-card rounded-xl border border-[#FFD700]/20 px-md py-sm text-label-caps font-bold text-[#FFD700] transition-colors hover:bg-[#FFD700]/10"
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
          >
            account_balance_wallet
          </span>
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
      <span className="text-label-caps text-on-surface-variant">
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
    <div className="flex flex-col items-center justify-center gap-md glass-card rounded-xl border-dashed px-md py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-highest">
        <span
          className="material-symbols-outlined text-on-surface-variant"
          style={{ fontSize: '28px', fontVariationSettings: "'FILL' 1" }}
        >
          redeem
        </span>
      </div>
      <div>
        <p className="text-body-md font-bold text-on-surface">
          {hasFilter ? 'No rewards in this category' : 'No rewards available'}
        </p>
        <p className="mt-xs text-label-caps text-on-surface-variant">
          {hasFilter
            ? 'Try the "All" tab to see rewards across all categories.'
            : 'Check back soon — new rewards are added regularly.'}
        </p>
      </div>
      {hasFilter && (
        <Link
          href="/app/rewards"
          className="mt-xs glass-card rounded-xl px-md py-sm text-label-caps font-bold text-on-surface hover:bg-surface-container-high transition-colors"
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

  const [playerProfile, allActiveRewards, filteredRewards, redemptionCount] =
    await Promise.all([
      prisma.playerProfile.findUnique({
        where: { userId: user.id },
        select: { totalPoints: true },
      }),
      getRewards({ activeOnly: true }),
      getRewards({
        activeOnly: true,
        ...(activeCategory ? { category: activeCategory } : {}),
      }),
      prisma.rewardRedemption.count({
        where: { userId: user.id },
      }),
    ])

  const totalPoints = playerProfile?.totalPoints ?? 0

  return (
    <div className="space-y-lg">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-headline-md font-black italic tracking-tight text-primary-fixed">
          Rewards Catalog
        </h1>
        <p className="mt-xs text-label-caps text-on-surface-variant">
          Redeem your hard-earned points for exclusive rewards.
        </p>
      </div>

      {/* ── Points Banner ── */}
      <PointsBanner points={totalPoints} redemptionCount={redemptionCount} />

      {/* ── Category Filter Tabs ── */}
      <div className="space-y-sm">
        <p className="text-label-caps text-on-surface-variant">Filter by category</p>
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
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
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
