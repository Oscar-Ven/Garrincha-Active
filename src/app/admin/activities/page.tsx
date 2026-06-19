import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ActivityStatus, ActivityType, Role } from '@/generated/prisma'
import { cn, formatDate, formatDistance, formatDuration, activityTypeLabel, activityTypeIcon } from '@/lib/utils'
import { approveActivity as approveActivityService, rejectActivity as rejectActivityService } from '@/services/activities'

export const metadata: Metadata = {
  title: 'Activity Review — Admin',
  description: 'Review and moderate player activities.',
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25

const STATUS_TABS: { label: string; value: ActivityStatus | 'ALL' }[] = [
  { label: 'Flagged', value: ActivityStatus.FLAGGED },
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: ActivityStatus.PENDING },
  { label: 'Approved', value: ActivityStatus.APPROVED },
  { label: 'Rejected', value: ActivityStatus.REJECTED },
]

// ─── Server Actions ───────────────────────────────────────────────────────────

async function approveActivity(formData: FormData) {
  'use server'

  const admin = await getCurrentUser()
  if (!admin || admin.role !== Role.PLATFORM_ADMIN) {
    throw new Error('Unauthorized')
  }

  const activityId = formData.get('activityId') as string
  if (!activityId) throw new Error('Missing activityId')

  await approveActivityService(activityId, admin.id)
  revalidatePath('/admin/activities')
}

async function rejectActivity(formData: FormData) {
  'use server'

  const admin = await getCurrentUser()
  if (!admin || admin.role !== Role.PLATFORM_ADMIN) {
    throw new Error('Unauthorized')
  }

  const activityId = formData.get('activityId') as string
  const reason = (formData.get('reason') as string | null)?.trim() || 'Rejected by admin'
  if (!activityId) throw new Error('Missing activityId')

  await rejectActivityService(activityId, admin.id, reason)
  revalidatePath('/admin/activities')
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getActivities(status: ActivityStatus | 'ALL', page: number) {
  const skip = (page - 1) * PAGE_SIZE

  const where =
    status === 'ALL'
      ? {}
      : { status }

  const [activities, total, counts] = await Promise.all([
    prisma.activity.findMany({
      where,
      orderBy: [
        // Flagged / Pending surfaced first within any mixed view
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: PAGE_SIZE,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            avatarUrl: true,
          },
        },
      },
    }),
    prisma.activity.count({ where }),
    prisma.activity.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
  ])

  const countMap: Record<string, number> = {}
  for (const row of counts) {
    countMap[row.status] = row._count.id
  }

  return { activities, total, countMap }
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ActivityStatus }) {
  const map: Record<ActivityStatus, { label: string; className: string }> = {
    FLAGGED: {
      label: 'Flagged',
      className: 'bg-red-500/15 text-red-400 ring-red-500/30',
    },
    PENDING: {
      label: 'Pending',
      className: 'bg-yellow-500/15 text-yellow-400 ring-yellow-500/30',
    },
    APPROVED: {
      label: 'Approved',
      className: 'bg-green-500/15 text-green-400 ring-green-500/30',
    },
    REJECTED: {
      label: 'Rejected',
      className: 'bg-slate-500/15 text-slate-400 ring-slate-500/30',
    },
  }

  const { label, className } = map[status]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1',
        className,
      )}
    >
      {label}
    </span>
  )
}

// ─── Action buttons ───────────────────────────────────────────────────────────

function ApproveButton({ activityId }: { activityId: string }) {
  return (
    <form action={approveActivity}>
      <input type="hidden" name="activityId" value={activityId} />
      <button
        type="submit"
        className="inline-flex items-center gap-1 rounded-lg border border-green-700/50 bg-green-600/10 px-3 py-1.5 text-xs font-semibold text-green-400 transition-colors hover:bg-green-600/25 hover:text-green-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
        title="Approve this activity"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Approve
      </button>
    </form>
  )
}

function RejectButton({ activityId }: { activityId: string }) {
  return (
    <form action={rejectActivity}>
      <input type="hidden" name="activityId" value={activityId} />
      <input type="hidden" name="reason" value="Rejected after admin review" />
      <button
        type="submit"
        className="inline-flex items-center gap-1 rounded-lg border border-red-700/50 bg-red-600/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-600/25 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
        title="Reject this activity"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        Reject
      </button>
    </form>
  )
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

function FilterTabs({
  active,
  countMap,
}: {
  active: ActivityStatus | 'ALL'
  countMap: Record<string, number>
}) {
  const totalAll = Object.values(countMap).reduce((s, n) => s + n, 0)

  function getCount(value: ActivityStatus | 'ALL'): number {
    if (value === 'ALL') return totalAll
    return countMap[value] ?? 0
  }

  function getTabStyle(value: ActivityStatus | 'ALL') {
    const isActive = active === value

    if (!isActive) {
      return 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
    }

    switch (value) {
      case ActivityStatus.FLAGGED:
        return 'border-red-600 bg-red-600/15 text-red-400'
      case ActivityStatus.PENDING:
        return 'border-yellow-600 bg-yellow-600/15 text-yellow-400'
      case ActivityStatus.APPROVED:
        return 'border-green-600 bg-green-600/15 text-green-400'
      case ActivityStatus.REJECTED:
        return 'border-slate-500 bg-slate-700/50 text-slate-300'
      default:
        return 'border-green-600 bg-green-600/15 text-green-400'
    }
  }

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by activity status">
      {STATUS_TABS.map(({ label, value }) => {
        const count = getCount(value)
        const params = new URLSearchParams()
        if (value !== 'ALL') params.set('status', value)
        const href = params.toString() ? `/admin/activities?${params}` : '/admin/activities'

        return (
          <Link
            key={value}
            href={href}
            role="tab"
            aria-selected={active === value}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
              getTabStyle(value),
            )}
          >
            {label}
            <span
              className={cn(
                'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums',
                active === value ? 'bg-white/15' : 'bg-slate-700',
              )}
            >
              {count}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

// ─── Table ────────────────────────────────────────────────────────────────────

type ActivityRow = Awaited<ReturnType<typeof getActivities>>['activities'][number]

function ActivityTable({ activities }: { activities: ActivityRow[] }) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-700 bg-slate-800/40 px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-700 text-2xl" aria-hidden="true">
          ✅
        </div>
        <p className="text-base font-semibold text-slate-200">No activities to review</p>
        <p className="text-sm text-slate-400">All caught up — there are no activities matching this filter.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-800/60">
            <th className="px-4 py-3 text-left font-semibold text-slate-300 whitespace-nowrap">Player</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-300 whitespace-nowrap">Type</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-300 whitespace-nowrap">Date</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-300 whitespace-nowrap">Distance</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-300 whitespace-nowrap">Duration</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-300 whitespace-nowrap">Speed</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-300 whitespace-nowrap">Points</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-300 whitespace-nowrap">Status</th>
            <th className="px-4 py-3 text-center font-semibold text-slate-300 whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/60">
          {activities.map((activity) => {
            const canAct =
              activity.status === ActivityStatus.FLAGGED ||
              activity.status === ActivityStatus.PENDING

            const speedDisplay = activity.speedKmH != null
              ? `${activity.speedKmH.toFixed(1)} km/h`
              : activity.distanceKm != null && activity.durationMinutes > 0
              ? `${((activity.distanceKm / activity.durationMinutes) * 60).toFixed(1)} km/h`
              : '—'

            return (
              <tr
                key={activity.id}
                className={cn(
                  'transition-colors hover:bg-slate-800/50',
                  activity.status === ActivityStatus.FLAGGED && 'bg-red-950/10',
                  activity.status === ActivityStatus.PENDING && 'bg-yellow-950/10',
                )}
              >
                {/* Player */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="relative h-8 w-8 shrink-0">
                      {activity.user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={activity.user.avatarUrl}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-600"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600/20 text-xs font-bold text-green-400 ring-1 ring-slate-600">
                          {activity.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-200 max-w-30">
                        {activity.user.name}
                      </p>
                      <p className="truncate text-xs text-slate-500 max-w-30">
                        @{activity.user.nickname}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Type */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span aria-hidden="true">{activityTypeIcon(activity.type)}</span>
                    <span className="hidden sm:inline">{activityTypeLabel(activity.type)}</span>
                  </span>
                </td>

                {/* Date */}
                <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                  {formatDate(activity.startedAt, 'MMM d, yyyy')}
                  <br />
                  <span className="text-xs text-slate-500">
                    {formatDate(activity.startedAt, 'h:mm a')}
                  </span>
                </td>

                {/* Distance */}
                <td className="px-4 py-3 text-right tabular-nums text-slate-300 whitespace-nowrap">
                  {activity.distanceKm != null ? formatDistance(activity.distanceKm) : '—'}
                </td>

                {/* Duration */}
                <td className="px-4 py-3 text-right tabular-nums text-slate-300 whitespace-nowrap">
                  {formatDuration(activity.durationMinutes)}
                </td>

                {/* Speed */}
                <td className="px-4 py-3 text-right tabular-nums text-slate-300 whitespace-nowrap">
                  {speedDisplay}
                </td>

                {/* Points */}
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {activity.pointsEarned > 0 ? (
                    <span className="font-semibold text-yellow-400 tabular-nums">
                      +{activity.pointsEarned}
                    </span>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <StatusBadge status={activity.status} />
                    {activity.flagReason && (
                      <p
                        className="max-w-35 truncate text-xs text-red-400"
                        title={activity.flagReason}
                      >
                        {activity.flagReason}
                      </p>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {canAct ? (
                    <div className="flex items-center justify-center gap-2">
                      <ApproveButton activityId={activity.id} />
                      <RejectButton activityId={activity.id} />
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <span className="text-xs text-slate-600">—</span>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page,
  total,
  status,
}: {
  page: number
  total: number
  status: ActivityStatus | 'ALL'
}) {
  const totalPages = Math.ceil(total / PAGE_SIZE)
  if (totalPages <= 1) return null

  function buildHref(p: number) {
    const params = new URLSearchParams()
    if (status !== 'ALL') params.set('status', status)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/admin/activities?${qs}` : '/admin/activities'
  }

  const prevPage = page > 1 ? page - 1 : null
  const nextPage = page < totalPages ? page + 1 : null

  const windowSize = 5
  const half = Math.floor(windowSize / 2)
  let start = Math.max(1, page - half)
  const end = Math.min(totalPages, start + windowSize - 1)
  if (end - start < windowSize - 1) start = Math.max(1, end - windowSize + 1)
  const pageNumbers: number[] = []
  for (let i = start; i <= end; i++) pageNumbers.push(i)

  return (
    <nav className="flex items-center justify-between gap-4 border-t border-slate-700/60 pt-5" aria-label="Pagination">
      <p className="text-sm text-slate-400">
        Page <span className="font-semibold text-slate-200">{page}</span> of{' '}
        <span className="font-semibold text-slate-200">{totalPages}</span>
        <span className="hidden sm:inline">
          {' '}— {total.toLocaleString()} total
        </span>
      </p>

      <div className="flex items-center gap-1">
        {prevPage ? (
          <Link
            href={buildHref(prevPage)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 transition-colors hover:border-slate-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
            aria-label="Previous page"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        ) : (
          <span className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg border border-slate-800 text-slate-600" aria-disabled="true">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </span>
        )}

        {pageNumbers.map((p) =>
          p === page ? (
            <span key={p} aria-current="page" className="flex h-9 w-9 items-center justify-center rounded-lg border border-green-600 bg-green-600/15 text-sm font-semibold text-green-400">
              {p}
            </span>
          ) : (
            <Link key={p} href={buildHref(p)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-sm text-slate-400 transition-colors hover:border-slate-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600">
              {p}
            </Link>
          ),
        )}

        {nextPage ? (
          <Link
            href={buildHref(nextPage)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 transition-colors hover:border-slate-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
            aria-label="Next page"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <span className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg border border-slate-800 text-slate-600" aria-disabled="true">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        )}
      </div>
    </nav>
  )
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCards({ countMap }: { countMap: Record<string, number> }) {
  const cards = [
    {
      label: 'Flagged',
      value: countMap[ActivityStatus.FLAGGED] ?? 0,
      color: 'text-red-400',
      bg: 'bg-red-600/10',
      ring: 'ring-red-600/20',
      border: 'border-red-900/40',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H13l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
      ),
    },
    {
      label: 'Pending',
      value: countMap[ActivityStatus.PENDING] ?? 0,
      color: 'text-yellow-400',
      bg: 'bg-yellow-600/10',
      ring: 'ring-yellow-600/20',
      border: 'border-yellow-900/40',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Approved',
      value: countMap[ActivityStatus.APPROVED] ?? 0,
      color: 'text-green-400',
      bg: 'bg-green-600/10',
      ring: 'ring-green-600/20',
      border: 'border-green-900/40',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Rejected',
      value: countMap[ActivityStatus.REJECTED] ?? 0,
      color: 'text-slate-400',
      bg: 'bg-slate-700/40',
      ring: 'ring-slate-600/20',
      border: 'border-slate-700/40',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={cn(
            'flex items-center gap-3 rounded-xl border bg-slate-800 p-4 ring-1',
            card.ring,
            card.border,
          )}
        >
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', card.bg, card.color)}>
            {card.icon}
          </div>
          <div>
            <p className="text-xs text-slate-400">{card.label}</p>
            <p className={cn('text-2xl font-bold tabular-nums', card.color)}>
              {card.value.toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>
}

export default async function AdminActivitiesPage({ searchParams }: PageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== Role.PLATFORM_ADMIN) redirect('/unauthorized')

  const params = await searchParams
  const rawStatus = params.status?.toUpperCase()
  const validStatuses: string[] = Object.values(ActivityStatus)

  const activeStatus: ActivityStatus | 'ALL' =
    rawStatus === 'ALL' ? 'ALL'
    : rawStatus && validStatuses.includes(rawStatus)
      ? (rawStatus as ActivityStatus)
      : ActivityStatus.FLAGGED // default: show flagged first

  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  const { activities, total, countMap } = await getActivities(activeStatus, page)

  const needsReview = (countMap[ActivityStatus.FLAGGED] ?? 0) + (countMap[ActivityStatus.PENDING] ?? 0)

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Activity Review</h1>
          <p className="mt-1 text-sm text-slate-400">
            Moderate player activities, approve or reject flagged submissions.
          </p>
        </div>

        {needsReview > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-red-700/40 bg-red-600/10 px-4 py-2.5 text-sm font-semibold text-red-400">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {needsReview} {needsReview === 1 ? 'activity' : 'activities'} need review
          </div>
        )}
      </div>

      {/* ── Summary cards ── */}
      <SummaryCards countMap={countMap} />

      {/* ── Filter tabs ── */}
      <FilterTabs active={activeStatus} countMap={countMap} />

      {/* ── Results info ── */}
      {total > 0 && (
        <p className="text-sm text-slate-400">
          Showing{' '}
          <span className="font-semibold text-slate-200">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}
          </span>{' '}
          of{' '}
          <span className="font-semibold text-slate-200">{total.toLocaleString()}</span>{' '}
          {activeStatus !== 'ALL' ? activeStatus.toLowerCase() : ''} activities
        </p>
      )}

      {/* ── Table ── */}
      <ActivityTable activities={activities} />

      {/* ── Pagination ── */}
      {total > PAGE_SIZE && (
        <Pagination page={page} total={total} status={activeStatus} />
      )}
    </div>
  )
}
