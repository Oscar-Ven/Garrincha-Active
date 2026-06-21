import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ActivityType } from '@/generated/prisma'
import { ActivityCard } from '@/components/player/activity-card'
import { cn, formatDistance, formatDuration, activityTypeLabel } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'My Matches & Sessions',
  description: 'View and manage your match and session history on Garrincha Active.',
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15

const ALL_TYPES = [
  ActivityType.PADEL,
  ActivityType.TENNIS,
  ActivityType.SQUASH,
  ActivityType.PICKLEBALL,
  ActivityType.BADMINTON,
  ActivityType.RACQUETBALL,
  ActivityType.RUN,
  ActivityType.WALK,
  ActivityType.CYCLING,
  ActivityType.FOOTBALL_TRAINING,
  ActivityType.FOOTBALL_MATCH,
  ActivityType.FITNESS,
  ActivityType.CUSTOM,
] as const

function activitySymbol(type: ActivityType): string {
  const map: Partial<Record<ActivityType, string>> = {
    PADEL: 'sports_tennis', TENNIS: 'sports_tennis', PICKLEBALL: 'sports_tennis',
    SQUASH: 'sports_handball', RACQUETBALL: 'sports_handball',
    BADMINTON: 'sports_badminton',
    RUN: 'directions_run', WALK: 'directions_walk',
    CYCLING: 'directions_bike',
    FOOTBALL_TRAINING: 'sports_soccer', FOOTBALL_MATCH: 'sports_soccer',
    FITNESS: 'fitness_center', CUSTOM: 'sports',
  }
  return map[type] ?? 'sports'
}

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
    { label: 'Activities',   value: totalActivities.toLocaleString(),          symbol: 'assignment',          colorClass: 'text-primary-fixed', bgClass: 'bg-primary-fixed/10' },
    { label: 'Distance',     value: formatDistance(totalDistance),              symbol: 'straighten',          colorClass: 'text-secondary',     bgClass: 'bg-secondary/10' },
    { label: 'Active Time',  value: formatDuration(totalMinutes),               symbol: 'timer',               colorClass: 'text-on-surface-variant', bgClass: 'bg-white/10' },
    { label: 'Points Earned',value: `${totalPoints.toLocaleString()} pts`,      symbol: 'stars',               colorClass: 'text-[#FFD700]',    bgClass: 'bg-[#FFD700]/10' },
    { label: 'Day Streak',   value: `${streakDays}d`,                           symbol: 'local_fire_department',colorClass: 'text-error',        bgClass: 'bg-error/10' },
  ]

  return (
    <div className="grid grid-cols-2 gap-sm sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => (
        <div key={stat.label} className="glass-card flex items-center gap-sm rounded-xl p-md">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', stat.bgClass, stat.colorClass)}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
            >
              {stat.symbol}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-label-caps text-on-surface-variant truncate">{stat.label}</p>
            <p className={cn('text-body-md font-bold leading-tight tabular-nums truncate', stat.colorClass)}>
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
  const symbol = activitySymbol(type)
  const label = activityTypeLabel(type)

  return (
    <div className="glass-card flex flex-wrap items-center gap-md rounded-xl px-md py-sm">
      <span className="flex items-center gap-sm font-bold text-on-surface">
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
        >
          {symbol}
        </span>
        {label} — filtered
      </span>
      <span className="text-label-caps text-on-surface-variant">
        <span className="font-bold text-on-surface">{count.toLocaleString()}</span> activities
      </span>
      {distanceKm != null && distanceKm > 0 && (
        <span className="text-label-caps text-on-surface-variant">
          <span className="font-bold text-on-surface">{formatDistance(distanceKm)}</span> total
        </span>
      )}
      {minutes != null && minutes > 0 && (
        <span className="text-label-caps text-on-surface-variant">
          <span className="font-bold text-on-surface">{formatDuration(minutes)}</span> active
        </span>
      )}
      {points != null && points > 0 && (
        <span className="text-label-caps text-on-surface-variant">
          <span className="font-bold text-[#FFD700]">{points.toLocaleString()} pts</span> earned
        </span>
      )}
    </div>
  )
}

function TypeFilterTabs({
  activeType,
  basePath,
}: {
  activeType: ActivityType | undefined
  basePath: string
  page: number
}) {
  function buildHref(type: ActivityType | undefined) {
    const params = new URLSearchParams()
    if (type) params.set('type', type)
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
          'rounded-xl border px-md py-xs text-label-caps font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed',
          activeType === undefined
            ? 'border-primary-fixed bg-primary-fixed/10 text-primary-fixed'
            : 'glass-card text-on-surface-variant hover:text-on-surface',
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
            'flex items-center gap-1.5 rounded-xl border px-md py-xs text-label-caps font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed',
            activeType === type
              ? 'border-primary-fixed bg-primary-fixed/10 text-primary-fixed'
              : 'glass-card text-on-surface-variant hover:text-on-surface',
          )}
        >
          <span
            className="material-symbols-outlined"
            aria-hidden="true"
            style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}
          >
            {activitySymbol(type)}
          </span>
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

  const navBtnBase = 'flex h-9 w-9 items-center justify-center rounded-xl text-label-caps font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed'

  return (
    <nav
      className="flex items-center justify-between gap-md border-t border-white/10 pt-md"
      aria-label="Pagination"
    >
      <p className="text-label-caps text-on-surface-variant">
        Page <span className="font-bold text-on-surface">{page}</span> of{' '}
        <span className="font-bold text-on-surface">{totalPages}</span>
        <span className="hidden sm:inline">
          {' '}— {total.toLocaleString()} total
        </span>
      </p>

      <div className="flex items-center gap-1">
        {/* Prev */}
        {prevPage ? (
          <Link href={buildHref(prevPage)} className={cn(navBtnBase, 'glass-card text-on-surface-variant hover:text-on-surface')} aria-label="Previous page">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chevron_left</span>
          </Link>
        ) : (
          <span className={cn(navBtnBase, 'border border-white/5 text-on-surface-variant/30 cursor-not-allowed')} aria-disabled="true" aria-label="Previous page">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chevron_left</span>
          </span>
        )}

        {/* Page numbers */}
        {pageNumbers.map((p) =>
          p === page ? (
            <span
              key={p}
              aria-current="page"
              className={cn(navBtnBase, 'border border-primary-fixed bg-primary-fixed/10 text-primary-fixed')}
            >
              {p}
            </span>
          ) : (
            <Link
              key={p}
              href={buildHref(p)}
              className={cn(navBtnBase, 'glass-card text-on-surface-variant hover:text-on-surface')}
            >
              {p}
            </Link>
          ),
        )}

        {/* Next */}
        {nextPage ? (
          <Link href={buildHref(nextPage)} className={cn(navBtnBase, 'glass-card text-on-surface-variant hover:text-on-surface')} aria-label="Next page">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chevron_right</span>
          </Link>
        ) : (
          <span className={cn(navBtnBase, 'border border-white/5 text-on-surface-variant/30 cursor-not-allowed')} aria-disabled="true" aria-label="Next page">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chevron_right</span>
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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

      {/* ── Page header ── */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-md">
        <div>
          <h1 className="text-headline-md font-black italic tracking-tight text-primary-fixed">
            My Matches &amp; Sessions
          </h1>
          <p className="mt-xs text-label-caps text-on-surface-variant">
            Track your racket sport matches and sessions over time.
          </p>
        </div>

        <div className="flex items-center gap-sm">
          <Link
            href="/app/activities/live"
            className="inline-flex items-center gap-sm rounded-xl border border-error/30 bg-error/10 px-md py-sm text-label-caps font-bold text-error transition-colors hover:bg-error/20"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-error" aria-hidden="true" />
            Record Live
          </Link>
          <Link
            href="/app/activities/log"
            className="inline-flex items-center gap-sm rounded-xl bg-primary-fixed px-md py-sm text-label-caps font-bold text-on-primary-fixed action-glow transition-colors hover:bg-primary-fixed-dim"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
            >
              add
            </span>
            Log Activity
          </Link>
        </div>
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
        <section className="mb-8 glass-card border-dashed rounded-xl px-md py-8 text-center">
          <div className="mx-auto mb-sm flex h-14 w-14 items-center justify-center rounded-full bg-primary-fixed/10">
            <span
              className="material-symbols-outlined text-primary-fixed"
              style={{ fontSize: '28px', fontVariationSettings: "'FILL' 1" }}
            >
              bolt
            </span>
          </div>
          <p className="text-body-md font-bold text-on-surface">Ready to start tracking?</p>
          <p className="mt-xs text-label-caps text-on-surface-variant">
            Log your first activity to begin earning points and building your stats.
          </p>
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
        <div className="mb-md">
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
        <div className="flex flex-col items-center justify-center gap-md glass-card border-dashed rounded-xl px-md py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-highest">
            <span
              className="material-symbols-outlined text-on-surface-variant"
              style={{ fontSize: '28px', fontVariationSettings: "'FILL' 1" }}
            >
              {activeType ? activitySymbol(activeType) : 'emoji_events'}
            </span>
          </div>
          <div>
            <p className="text-body-md font-bold text-on-surface">
              {activeType
                ? `No ${activityTypeLabel(activeType)} activities yet`
                : 'No activities logged yet'}
            </p>
            <p className="mt-xs text-label-caps text-on-surface-variant">
              {activeType
                ? `Switch to a different type or log your first ${activityTypeLabel(activeType)}.`
                : 'Start logging your workouts to track your progress and earn points.'}
            </p>
          </div>
          <Link
            href="/app/activities/log"
            className="mt-xs inline-flex items-center gap-sm rounded-xl bg-primary-fixed px-md py-sm text-label-caps font-bold text-on-primary-fixed transition-colors hover:bg-primary-fixed-dim"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
            >
              add
            </span>
            Log Activity
          </Link>
        </div>
      ) : (
        <section aria-label="Activity list">
          {/* Results count */}
          <p className="mb-md text-label-caps text-on-surface-variant">
            Showing{' '}
            <span className="font-bold text-on-surface">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}
            </span>{' '}
            of{' '}
            <span className="font-bold text-on-surface">{total.toLocaleString()}</span>{' '}
            {activeType ? activityTypeLabel(activeType).toLowerCase() : ''} activities
          </p>

          <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
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
  )
}
