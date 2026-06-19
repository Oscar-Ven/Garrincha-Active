import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  RedemptionStatus,
  PointsSourceType,
  type Prisma,
} from '@/generated/prisma'
import { cn, formatDateTime, rewardCategoryLabel } from '@/lib/utils'
import { getLevelFromPoints } from '@/lib/points-rules'

export const metadata: Metadata = {
  title: 'Redemptions – Admin',
  description: 'Manage player reward redemptions.',
}

// ─── Types ────────────────────────────────────────────────────────────────────

type RedemptionWithRelations = Prisma.RewardRedemptionGetPayload<{
  include: {
    user: { select: { id: true; name: true; nickname: true } }
    reward: { select: { id: true; title: true; category: true; pointsCost: true } }
  }
}>

// ─── Server Actions ───────────────────────────────────────────────────────────

async function markAsUsed(redemptionId: string): Promise<void> {
  'use server'

  const redemption = await prisma.rewardRedemption.findUnique({
    where: { id: redemptionId },
  })

  if (!redemption) throw new Error('Redemption not found')
  if (redemption.status !== RedemptionStatus.PENDING) {
    throw new Error('Only PENDING redemptions can be marked as used')
  }

  await prisma.rewardRedemption.update({
    where: { id: redemptionId },
    data: {
      status: RedemptionStatus.USED,
      usedAt: new Date(),
    },
  })

  revalidatePath('/admin/redemptions')
}

async function cancelRedemption(redemptionId: string): Promise<void> {
  'use server'

  const redemption = await prisma.rewardRedemption.findUnique({
    where: { id: redemptionId },
    include: { reward: { select: { title: true } } },
  })

  if (!redemption) throw new Error('Redemption not found')
  if (redemption.status !== RedemptionStatus.PENDING) {
    throw new Error('Only PENDING redemptions can be cancelled')
  }

  await prisma.$transaction(async (tx) => {
    // Update redemption status
    await tx.rewardRedemption.update({
      where: { id: redemptionId },
      data: { status: RedemptionStatus.CANCELLED },
    })

    // Refund points to player
    await tx.pointsLedger.create({
      data: {
        userId: redemption.userId,
        sourceType: PointsSourceType.CUSTOM,
        sourceId: redemptionId,
        points: redemption.pointsSpent,
        reason: `Refund: cancelled redemption of "${redemption.reward.title}"`,
      },
    })

    // Update player profile balance
    const profile = await tx.playerProfile.findUnique({
      where: { userId: redemption.userId },
      select: { totalPoints: true, lifetimePoints: true },
    })

    if (profile) {
      const newTotal = profile.totalPoints + redemption.pointsSpent
      await tx.playerProfile.update({
        where: { userId: redemption.userId },
        data: {
          totalPoints: newTotal,
          level: getLevelFromPoints(newTotal),
        },
      })
    }
  })

  revalidatePath('/admin/redemptions')
}

// ─── Data fetching ────────────────────────────────────────────────────────────

const PAGE_SIZE = 30

async function getRedemptions(
  status: RedemptionStatus | undefined,
  page: number,
): Promise<{ rows: RedemptionWithRelations[]; total: number; counts: Record<string, number> }> {
  const where: Prisma.RewardRedemptionWhereInput = status ? { status } : {}

  const [rows, total, pendingCount, usedCount, cancelledCount, expiredCount] =
    await Promise.all([
      prisma.rewardRedemption.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          user: { select: { id: true, name: true, nickname: true } },
          reward: { select: { id: true, title: true, category: true, pointsCost: true } },
        },
      }),
      prisma.rewardRedemption.count({ where }),
      prisma.rewardRedemption.count({ where: { status: RedemptionStatus.PENDING } }),
      prisma.rewardRedemption.count({ where: { status: RedemptionStatus.USED } }),
      prisma.rewardRedemption.count({ where: { status: RedemptionStatus.CANCELLED } }),
      prisma.rewardRedemption.count({ where: { status: RedemptionStatus.EXPIRED } }),
    ])

  return {
    rows,
    total,
    counts: {
      ALL: pendingCount + usedCount + cancelledCount + expiredCount,
      PENDING: pendingCount,
      USED: usedCount,
      CANCELLED: cancelledCount,
      EXPIRED: expiredCount,
    },
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusLabel(status: RedemptionStatus): string {
  switch (status) {
    case RedemptionStatus.PENDING:
      return 'Pending'
    case RedemptionStatus.USED:
      return 'Used'
    case RedemptionStatus.CANCELLED:
      return 'Cancelled'
    case RedemptionStatus.EXPIRED:
      return 'Expired'
  }
}

function statusPill(status: RedemptionStatus): string {
  switch (status) {
    case RedemptionStatus.PENDING:
      return 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/30'
    case RedemptionStatus.USED:
      return 'bg-green-600/10 text-green-400 ring-1 ring-green-600/25'
    case RedemptionStatus.CANCELLED:
      return 'bg-slate-600/10 text-slate-400 ring-1 ring-slate-600/25'
    case RedemptionStatus.EXPIRED:
      return 'bg-red-600/10 text-red-400 ring-1 ring-red-600/25'
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusFilterTabs({
  current,
  counts,
}: {
  current: string
  counts: Record<string, number>
}) {
  const tabs: { key: string; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'USED', label: 'Used' },
    { key: 'CANCELLED', label: 'Cancelled' },
    { key: 'EXPIRED', label: 'Expired' },
  ]

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
      {tabs.map((tab) => {
        const isActive = current === tab.key
        return (
          <a
            key={tab.key}
            href={tab.key === 'ALL' ? '/admin/redemptions' : `/admin/redemptions?status=${tab.key}`}
            role="tab"
            aria-selected={isActive}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-green-600 text-white shadow-sm shadow-green-900/40'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200',
            )}
          >
            {tab.label}
            <span
              className={cn(
                'rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums',
                isActive ? 'bg-white/15 text-white' : 'bg-slate-700 text-slate-300',
              )}
            >
              {counts[tab.key] ?? 0}
            </span>
          </a>
        )
      })}
    </div>
  )
}

function EmptyState() {
  return (
    <tr>
      <td colSpan={7}>
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800">
            <svg
              className="h-7 w-7 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-300">No redemptions found</p>
            <p className="mt-1 text-xs text-slate-500">
              Try a different status filter or check back later.
            </p>
          </div>
        </div>
      </td>
    </tr>
  )
}

function ActionButtons({ redemption }: { redemption: RedemptionWithRelations }) {
  if (redemption.status !== RedemptionStatus.PENDING) {
    return <span className="text-xs text-slate-600">—</span>
  }

  const markUsedAction = markAsUsed.bind(null, redemption.id)
  const cancelAction = cancelRedemption.bind(null, redemption.id)

  return (
    <div className="flex items-center gap-2">
      <form action={markUsedAction}>
        <button
          type="submit"
          className={cn(
            'rounded-lg bg-green-600/10 px-2.5 py-1 text-xs font-semibold text-green-400 ring-1 ring-green-600/25',
            'hover:bg-green-600/20 hover:text-green-300 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
          )}
        >
          Mark Used
        </button>
      </form>
      <form action={cancelAction}>
        <button
          type="submit"
          className={cn(
            'rounded-lg bg-red-600/10 px-2.5 py-1 text-xs font-semibold text-red-400 ring-1 ring-red-600/25',
            'hover:bg-red-600/20 hover:text-red-300 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500',
          )}
        >
          Cancel
        </button>
      </form>
    </div>
  )
}

function PaginationBar({
  page,
  total,
  status,
}: {
  page: number
  total: number
  status: string
}) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  if (totalPages <= 1) return null

  const statusParam = status !== 'ALL' ? `&status=${status}` : ''
  const prevHref = page > 1 ? `/admin/redemptions?page=${page - 1}${statusParam}` : null
  const nextHref = page < totalPages ? `/admin/redemptions?page=${page + 1}${statusParam}` : null

  return (
    <div className="flex items-center justify-between border-t border-slate-800 px-5 py-3 text-sm text-slate-400">
      <span>
        Page {page} of {totalPages} &mdash; {total.toLocaleString()} total
      </span>
      <div className="flex gap-2">
        {prevHref ? (
          <a
            href={prevHref}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium hover:bg-slate-700 hover:text-white transition-colors"
          >
            Previous
          </a>
        ) : (
          <span className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-medium text-slate-600 cursor-not-allowed">
            Previous
          </span>
        )}
        {nextHref ? (
          <a
            href={nextHref}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium hover:bg-slate-700 hover:text-white transition-colors"
          >
            Next
          </a>
        ) : (
          <span className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-medium text-slate-600 cursor-not-allowed">
            Next
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>
}

export default async function AdminRedemptionsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'PLATFORM_ADMIN' && user.role !== 'CENTER_ADMIN') {
    redirect('/app')
  }

  const params = await searchParams
  const rawStatus = params.status?.toUpperCase()
  const validStatuses: string[] = ['PENDING', 'USED', 'CANCELLED', 'EXPIRED']
  const activeStatus = rawStatus && validStatuses.includes(rawStatus)
    ? (rawStatus as RedemptionStatus)
    : undefined

  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  const { rows, total, counts } = await getRedemptions(activeStatus, page)

  const filterKey = activeStatus ?? 'ALL'

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Redemptions</h1>
          <p className="mt-1 text-sm text-slate-400">
            Review and manage player reward redemptions.
          </p>
        </div>

        {/* Summary pills */}
        <div className="flex flex-wrap gap-2">
          <div className="rounded-xl border border-yellow-600/20 bg-yellow-600/10 px-4 py-2 text-center">
            <p className="text-xs text-slate-400">Pending</p>
            <p className="text-lg font-bold text-yellow-400 tabular-nums">
              {counts.PENDING.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-green-600/20 bg-green-600/10 px-4 py-2 text-center">
            <p className="text-xs text-slate-400">Used</p>
            <p className="text-lg font-bold text-green-400 tabular-nums">
              {counts.USED.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-center">
            <p className="text-xs text-slate-400">Cancelled</p>
            <p className="text-lg font-bold text-slate-300 tabular-nums">
              {counts.CANCELLED.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <StatusFilterTabs current={filterKey} counts={counts} />

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        {/* Mobile card list */}
        <ul className="divide-y divide-slate-800 lg:hidden">
          {rows.length === 0 ? (
            <li className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
                <svg
                  className="h-6 w-6 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-300">No redemptions found</p>
                <p className="mt-1 text-xs text-slate-500">
                  Try a different status filter.
                </p>
              </div>
            </li>
          ) : (
            rows.map((row) => (
              <li key={row.id} className="space-y-2.5 px-4 py-4">
                {/* Row 1: reward + status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {row.reward.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {rewardCategoryLabel(row.reward.category)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold',
                      statusPill(row.status),
                    )}
                  >
                    {statusLabel(row.status)}
                  </span>
                </div>

                {/* Row 2: player */}
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <svg
                    className="h-3.5 w-3.5 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    />
                  </svg>
                  <span className="font-medium text-slate-300">{row.user.name}</span>
                  <span className="text-slate-600">@{row.user.nickname}</span>
                </div>

                {/* Row 3: code + cost + date */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <code className="select-all rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-300">
                    {row.redemptionCode}
                  </code>
                  <span className="font-semibold text-red-400">
                    -{row.pointsSpent.toLocaleString()} pts
                  </span>
                  <span>{formatDateTime(row.createdAt)}</span>
                </div>

                {/* Row 4: actions */}
                {row.status === RedemptionStatus.PENDING && (
                  <div className="pt-1">
                    <ActionButtons redemption={row} />
                  </div>
                )}
              </li>
            ))
          )}
        </ul>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Player
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Reward
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Code
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Points
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Date
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rows.length === 0 ? (
                <EmptyState />
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="group transition-colors hover:bg-slate-800/40"
                  >
                    {/* Player */}
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-200">{row.user.name}</p>
                      <p className="text-xs text-slate-500">@{row.user.nickname}</p>
                    </td>

                    {/* Reward */}
                    <td className="max-w-[220px] px-5 py-3.5">
                      <p className="truncate font-medium text-slate-200">
                        {row.reward.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {rewardCategoryLabel(row.reward.category)}
                      </p>
                    </td>

                    {/* Code */}
                    <td className="px-5 py-3.5">
                      <code className="select-all rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-300">
                        {row.redemptionCode}
                      </code>
                    </td>

                    {/* Points cost */}
                    <td className="whitespace-nowrap px-5 py-3.5 text-right font-bold tabular-nums text-red-400">
                      -{row.pointsSpent.toLocaleString()}
                    </td>

                    {/* Date */}
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-400">
                      {formatDateTime(row.createdAt)}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold',
                          statusPill(row.status),
                        )}
                      >
                        {statusLabel(row.status)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <ActionButtons redemption={row} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <PaginationBar page={page} total={total} status={filterKey} />
      </div>
    </div>
  )
}
