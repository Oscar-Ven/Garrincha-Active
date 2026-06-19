import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ActivityType } from '@/generated/prisma'
import { ActivityCard } from '@/components/player/activity-card'
import { cn, formatDistance, formatDuration, activityTypeLabel, activityTypeIcon } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'My Activities',
  description: 'View and manage your activity history on Garrincha Active.',
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15

const ALL_TYPES = [
  ActivityType.RUN,
  ActivityType.WALK,
  ActivityType.CYCLING,
  ActivityType.FOOTBALL_TRAINING,
  ActivityType.FOOTBALL_MATCH,
  ActivityType.FITNESS,
  ActivityType.CUSTOM,
] as const

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getPageData(
  userId: string,
  page: number,
  type: ActivityType | undefined,
) {
  const skip = (page - 1) * PAGE_SIZE

  const where = {
    userId,
    ...(type ? { type } : {}),
  }

  const [activities, total, profile, allTimeTotals] = await Promise.all([
    prisma.activity.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: {
        user: {
          select: {
            name: true,
            nickname: true,
            avatarUrl: true,
          },
        },
      },
    }),
    prisma.activity.count({ where }),
    prisma.playerProfile.findUnique({
      where: { userId },
      select: {
        totalActivities: true,
        totalDistance: true,
        totalMinutes: true,
        totalPoints: true,
        streakDays: true,
      },
    }),
    // Aggregate totals for the filtered set (to show filtered stats when type is selected)
    type
      ? prisma.activity.aggregate({
          where,
          _sum: {
            distanceKm: true,
            durationMinutes: true,
            pointsEarned: true,
          },
          _count: { id: true },
        })
      : null,
  ])

  return { activities, total, profile, allTimeTotals }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatsBar({
  totalActivities,
  totalDistance,
  totalMinutes,
  totalPoints,
  streakDays,
}: {
  totalActivities: number
  totalDistance: number
  totalMinutes: number
  totalPoints: number
  streakDays: number
}) {
  const stats = [
    {
      label: 'Activities',
      value: totalActivities.toLocaleString(),
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: 'text-green-400',
      bg: 'bg-green-600/10',
      ring: 'ring-green-600/20',
    },
    {
      label: 'Distance',
      value: formatDistance(totalDistance),
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      color: 'text-blue-400',
      bg: 'bg-blue-600/10',
      ring: 'ring-blue-600/20',
    },
    {
      label: 'Active Time',
      value: formatDuration(totalMinutes),
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-purple-400',
      bg: 'bg-purple-600/10',
      ring: 'ring-purple-600/20',
    },
    {
      label: 'Points Earned',
      value: `${totalPoints.toLocaleString()} pts`,
      icon: (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ),
      color: 'text-yellow-400',
      bg: 'bg-yellow-600/10',
      ring: 'ring-yellow-600/20',
    },
    {
      label: 'Day Streak',
      value: `${streakDays}d`,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
        </svg>
      ),
      color: 'text-orange-400',
      bg: 'bg-orange-600/10',
      ring: 'ring-orange-600/20',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={cn(
            'flex items-center gap-3 rounded-xl border bg-slate-800 p-4 ring-1',
            stat.ring,
            'border-slate-700',
          )}
        >
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', stat.bg, stat.color)}>
            {stat.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 truncate">{stat.label}</p>
            <p className={cn('text-lg font-bold leading-tight tabular-nums truncate', stat.color)}>
              {stat.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function FilteredStatsBanner({
  count,
  distanceKm,
  minutes,
  points,
  type,
}: {
  count: number
  distanceKm: number | null
  minutes: number | null
  points: number | null
  type: ActivityType
}) {
  const icon = activityTypeIcon(type)
  const label = activityTypeLabel(type)

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-700 bg-slate-800/60 px-5 py-3 text-sm">
      <span className="flex items-center gap-2 font-semibold text-slate-200">
        <span className="text-base">{icon}</span>
        {label} — filtered
      </span>
      <span className="text-slate-400">
        <span className="font-semibold text-slate-200">{count.toLocaleString()}</span> activities
      </span>
      {distanceKm != null && distanceKm > 0 && (
        <span className="text-slate-400">
          <span className="font-semibold text-slate-200">{formatDistance(distanceKm)}</span> total
        </span>
      )}
      {minutes != null && minutes > 0 && (
        <span className="text-slate-400">
          <span className="font-semibold text-slate-200">{formatDuration(minutes)}</span> active
        </span>
      )}
      {points != null && points > 0 && (
        <span className="text-slate-400">
          <span className="font-semibold text-yellow-400">{points.toLocaleString()} pts</span> earned
        </span>
      )}
    </div>
  )
}

function TypeFilterTabs({
  activeType,
  basePath,
  page,
}: {
  activeType: ActivityType | undefined
  basePath: string
  page: number
}) {
  function buildHref(type: ActivityType | undefined) {
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    // Reset to page 1 when changing filter
    const qs = params.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by activity type">
      <Link
        href={buildHref(undefined)}
        role="tab"
        aria-selected={activeType === undefined}
        className={cn(
          'rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
          activeType === undefined
            ? 'border-green-600 bg-green-600/15 text-green-400'
            : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200',
        )}
      >
        All
      </Link>

      {ALL_TYPES.map((type) => (
        <Link
          key={type}
          href={buildHref(type)}
          role="tab"
          aria-selected={activeType === type}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
            activeType === type
              ? 'border-green-600 bg-green-600/15 text-green-400'
              : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200',
          )}
        >
          <span aria-hidden="true">{activityTypeIcon(type)}</span>
          <span>{activityTypeLabel(type)}</span>
        </Link>
      ))}
    </div>
  )
}

function Pagination({
  page,
  total,
  pageSize,
  type,
}: {
  page: number
  total: number
  pageSize: number
  type: ActivityType | undefined
}) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  function buildHref(p: number) {
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/app/activities?${qs}` : '/app/activities'
  }

  const prevPage = page > 1 ? page - 1 : null
  const nextPage = page < totalPages ? page + 1 : null

  // Build a small window of page numbers
  const windowSize = 5
  const half = Math.floor(windowSize / 2)
  let start = Math.max(1, page - half)
  const end = Math.min(totalPages, start + windowSize - 1)
  if (end - start < windowSize - 1) {
    start = Math.max(1, end - windowSize + 1)
  }
  const pageNumbers: number[] = []
  for (let i = start; i <= end; i++) {
    pageNumbers.push(i)
  }

  return (
    <nav
      className="flex items-center justify-between gap-4 border-t border-slate-700/60 pt-6"
      aria-label="Pagination"
    >
      <p className="text-sm text-slate-400">
        Page <span className="font-semibold text-slate-200">{page}</span> of{' '}
        <span className="font-semibold text-slate-200">{totalPages}</span>
        <span className="hidden sm:inline">
          {' '}— {total.toLocaleString()} total
        </span>
      </p>

      <div className="flex items-center gap-1">
        {/* Prev */}
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
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-600 cursor-not-allowed" aria-disabled="true" aria-label="Previous page">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </span>
        )}

        {/* Page numbers */}
        {pageNumbers.map((p) =>
          p === page ? (
            <span
              key={p}
              aria-current="page"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-green-600 bg-green-600/15 text-sm font-semibold text-green-400"
            >
              {p}
            </span>
          ) : (
            <Link
              key={p}
              href={buildHref(p)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-sm text-slate-400 transition-colors hover:border-slate-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
            >
              {p}
            </Link>
          ),
        )}

        {/* Next */}
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
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-600 cursor-not-allowed" aria-disabled="true" aria-label="Next page">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        )}
      </div>
    </nav>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ type?: string; page?: string }>
}

export default async function ActivitiesPage({ searchParams }: PageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const rawType = params.type?.toUpperCase()
  const activeType = rawType && (ALL_TYPES as readonly string[]).includes(rawType)
    ? (rawType as ActivityType)
    : undefined
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  const { activities, total, profile, allTimeTotals } = await getPageData(user.id, page, activeType)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ── Page header ── */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">My Activities</h1>
            <p className="mt-1 text-sm text-slate-400">
              Track your fitness journey and see your progress over time.
            </p>
          </div>

          <Link
            href="/app/activities/log"
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-900/30 transition-colors hover:bg-green-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Log New Activity
          </Link>
        </div>

        {/* ── Total stats summary ── */}
        {profile ? (
          <section className="mb-8" aria-label="Your stats summary">
            <StatsBar
              totalActivities={profile.totalActivities}
              totalDistance={profile.totalDistance}
              totalMinutes={profile.totalMinutes}
              totalPoints={profile.totalPoints}
              streakDays={profile.streakDays}
            />
          </section>
        ) : (
          /* No profile yet — first-time user nudge */
          <section className="mb-8 rounded-xl border border-dashed border-slate-700 bg-slate-800/40 px-6 py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-600/10 text-green-400 mb-3">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-slate-200">Ready to start tracking?</p>
            <p className="mt-1 text-sm text-slate-400">Log your first activity to begin earning points and building your stats.</p>
          </section>
        )}

        {/* ── Type filter tabs ── */}
        <section className="mb-6" aria-label="Filter activities by type">
          <TypeFilterTabs
            activeType={activeType}
            basePath="/app/activities"
            page={page}
          />
        </section>

        {/* ── Filtered stats banner ── */}
        {activeType && allTimeTotals && allTimeTotals._count.id > 0 && (
          <div className="mb-5">
            <FilteredStatsBanner
              count={allTimeTotals._count.id}
              distanceKm={allTimeTotals._sum.distanceKm ?? null}
              minutes={allTimeTotals._sum.durationMinutes ?? null}
              points={allTimeTotals._sum.pointsEarned ?? null}
              type={activeType}
            />
          </div>
        )}

        {/* ── Activity list ── */}
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-700 bg-slate-800/40 px-6 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700 text-2xl">
              {activeType ? activityTypeIcon(activeType) : '🏅'}
            </div>
            <div>
              <p className="text-base font-semibold text-slate-200">
                {activeType
                  ? `No ${activityTypeLabel(activeType)} activities yet`
                  : 'No activities logged yet'}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {activeType
                  ? `Switch to a different type or log your first ${activityTypeLabel(activeType)}.`
                  : 'Start logging your workouts to track your progress and earn points.'}
              </p>
            </div>
            <Link
              href="/app/activities/log"
              className="mt-1 inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Log Activity
            </Link>
          </div>
        ) : (
          <section aria-label="Activity list">
            {/* Results count */}
            <p className="mb-4 text-sm text-slate-400">
              Showing{' '}
              <span className="font-semibold text-slate-200">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-slate-200">{total.toLocaleString()}</span>{' '}
              {activeType ? activityTypeLabel(activeType).toLowerCase() : ''} activities
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={{
                    id: activity.id,
                    title: activity.title,
                    type: activity.type,
                    startedAt: activity.startedAt,
                    durationMinutes: activity.durationMinutes,
                    distanceKm: activity.distanceKm,
                    pointsEarned: activity.pointsEarned,
                    user: activity.user,
                  }}
                />
              ))}
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  page={page}
                  total={total}
                  pageSize={PAGE_SIZE}
                  type={activeType}
                />
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
