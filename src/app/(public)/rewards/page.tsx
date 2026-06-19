import type { Metadata } from 'next'
import Link from 'next/link'
import { getRewards } from '@/services/rewards'
import { rewardCategoryLabel } from '@/lib/utils'
import { RewardCategory } from '@/generated/prisma'

export const metadata: Metadata = {
  title: 'Rewards',
  description:
    'Earn points by staying active and redeem them for exclusive rewards — discounts, free sessions, merchandise, and more.',
}

// ─── Category icon map ────────────────────────────────────────────────────────

function categoryIcon(category: RewardCategory): string {
  switch (category) {
    case RewardCategory.DISCOUNT:
      return '🏷️'
    case RewardCategory.MERCHANDISE:
      return '👕'
    case RewardCategory.FREE_SESSION:
      return '🎟️'
    case RewardCategory.FOOD_DRINK:
      return '🥤'
    case RewardCategory.TOURNAMENT_ENTRY:
      return '🏆'
    case RewardCategory.SPONSOR_VOUCHER:
      return '🎁'
    case RewardCategory.VIP_ACCESS:
      return '⭐'
    default:
      return '🎁'
  }
}

// ─── Category badge color ─────────────────────────────────────────────────────

function categoryBadgeClass(category: RewardCategory): string {
  switch (category) {
    case RewardCategory.DISCOUNT:
      return 'bg-blue-100 text-blue-700'
    case RewardCategory.MERCHANDISE:
      return 'bg-purple-100 text-purple-700'
    case RewardCategory.FREE_SESSION:
      return 'bg-green-100 text-green-700'
    case RewardCategory.FOOD_DRINK:
      return 'bg-orange-100 text-orange-700'
    case RewardCategory.TOURNAMENT_ENTRY:
      return 'bg-yellow-100 text-yellow-700'
    case RewardCategory.SPONSOR_VOUCHER:
      return 'bg-pink-100 text-pink-700'
    case RewardCategory.VIP_ACCESS:
      return 'bg-amber-100 text-amber-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

// ─── Reward card ──────────────────────────────────────────────────────────────

type RewardCardProps = {
  title: string
  category: RewardCategory
  pointsCost: number
  sponsor: { name: string; logoUrl: string | null } | null
}

function RewardCard({ title, category, pointsCost, sponsor }: RewardCardProps) {
  return (
    <div className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-green-200 overflow-hidden">
      {/* Card header — icon area */}
      <div className="flex items-center justify-center bg-slate-50 h-32 text-5xl select-none group-hover:bg-green-50">
        {categoryIcon(category)}
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 gap-3 p-4">
        {/* Category badge */}
        <span
          className={`self-start rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryBadgeClass(category)}`}
        >
          {rewardCategoryLabel(category)}
        </span>

        {/* Title */}
        <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
          {title}
        </h3>

        {/* Sponsor tag */}
        {sponsor && (
          <p className="text-xs text-slate-500 truncate">
            by {sponsor.name}
          </p>
        )}

        {/* Spacer pushes cost to bottom */}
        <div className="flex-1" />

        {/* Points cost */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-base font-bold text-yellow-600">
            {pointsCost.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500 font-medium">pts</span>
        </div>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4">🎁</div>
      <h3 className="text-lg font-semibold text-slate-700 mb-1">
        Rewards coming soon
      </h3>
      <p className="text-sm text-slate-500 max-w-xs">
        New rewards are added regularly. Sign up to be notified when the catalog
        goes live.
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RewardsPage() {
  const rewards = await getRewards({ activeOnly: true })

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Hero ── */}
      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          {/* Eyebrow */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-900/50 border border-green-700/40 px-3 py-1 text-xs font-semibold text-green-300 tracking-wide uppercase mb-6">
            <span>🏅</span> Earn. Redeem. Repeat.
          </span>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Rewards that move{' '}
            <span className="text-green-400">with you</span>
          </h1>

          <p className="mx-auto max-w-xl text-slate-300 text-base sm:text-lg leading-relaxed mb-8">
            Every run, match, and training session earns you points on Garrincha
            Active. Cash them in for exclusive discounts, free sessions,
            merchandise, and more.
          </p>

          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold px-7 py-3 text-sm shadow-lg shadow-green-900/30"
          >
            Sign up to redeem rewards
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {[
              {
                icon: '🏃',
                title: 'Be active',
                body: 'Log runs, matches, training sessions, and more.',
              },
              {
                icon: '🪙',
                title: 'Earn points',
                body: 'Every activity awards points based on effort and duration.',
              },
              {
                icon: '🎁',
                title: 'Redeem rewards',
                body: 'Spend your points on rewards from partners and sponsors.',
              },
            ].map((step) => (
              <div key={step.title} className="flex flex-col items-center gap-2">
                <span className="text-3xl">{step.icon}</span>
                <h3 className="font-semibold text-slate-800 text-sm">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-[200px]">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Rewards catalog ── */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Available rewards
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {rewards.length > 0
                ? `${rewards.length} reward${rewards.length === 1 ? '' : 's'} available right now`
                : 'Check back soon for new rewards'}
            </p>
          </div>
          <Link
            href="/register"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-green-600 text-green-700 hover:bg-green-50 font-medium px-4 py-2 text-sm"
          >
            Sign up to redeem
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-3.5 h-3.5"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {rewards.length === 0 ? (
            <EmptyState />
          ) : (
            rewards.map((reward) => (
              <RewardCard
                key={reward.id}
                title={reward.title}
                category={reward.category}
                pointsCost={reward.pointsCost}
                sponsor={reward.sponsor}
              />
            ))
          )}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="bg-green-600">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Ready to start earning?
          </h2>
          <p className="text-green-100 text-sm mb-6 max-w-sm mx-auto">
            Create your free account and start collecting points from your very
            first activity.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="rounded-xl bg-white text-green-700 hover:bg-green-50 font-semibold px-7 py-3 text-sm shadow"
            >
              Sign up for free
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-green-400 text-white hover:bg-green-500 font-medium px-7 py-3 text-sm"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
