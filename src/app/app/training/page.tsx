import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { formatDistance, formatDuration } from '@/lib/utils'
import { ActivityType } from '@/generated/prisma'

export const metadata: Metadata = {
  title: 'Training Dashboard',
  description: 'Your personal training dashboard with stats, streaks, and personal records',
}

// ─── Data ─────────────────────────────────────────────────────────────────────

function weeksAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfWeek(): Date {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfMonth(): Date {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfYear(): Date {
  const d = new Date()
  d.setMonth(0, 1)
  d.setHours(0, 0, 0, 0)
  return d
}

const PR_LABELS: Record<string, { label: string; unit: string; format: (v: number) => string }> = {
  FASTEST_1KM:          { label: 'Fastest 1km',       unit: 'min/km',     format: (v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` },
  FASTEST_5KM:          { label: 'Fastest 5km',        unit: 'time',       format: (v) => `${Math.floor(v / 60)}m ${v % 60}s` },
  FASTEST_10KM:         { label: 'Fastest 10km',       unit: 'time',       format: (v) => `${Math.floor(v / 60)}m ${v % 60}s` },
  LONGEST_RUN:          { label: 'Longest Run',         unit: 'km',         format: (v) => `${v.toFixed(1)} km` },
  LONGEST_RIDE:         { label: 'Longest Ride',        unit: 'km',         format: (v) => `${v.toFixed(1)} km` },
  MOST_ACTIVITIES_WEEK: { label: 'Most Active Week',    unit: 'activities', format: (v) => `${v} activities` },
}

async function getTrainingData(userId: string) {
  const sowDate = startOfWeek()
  const somDate = startOfMonth()
  const soyDate = startOfYear()
  const w12Ago = weeksAgo(12)

  const [profile, prs, weekActivities, monthActivities, yearActivities, last12wActivities] = await Promise.all([
    prisma.playerProfile.findUnique({ where: { userId } }),
    prisma.personalRecord.findMany({ where: { userId }, orderBy: { recordedAt: 'desc' } }),
    prisma.activity.findMany({
      where: { userId, startedAt: { gte: sowDate }, status: 'APPROVED' },
      select: { id: true, type: true, durationMinutes: true, distanceKm: true, pointsEarned: true, startedAt: true },
    }),
    prisma.activity.findMany({
      where: { userId, startedAt: { gte: somDate }, status: 'APPROVED' },
      select: { id: true, type: true, durationMinutes: true, distanceKm: true, pointsEarned: true, startedAt: true },
    }),
    prisma.activity.findMany({
      where: { userId, startedAt: { gte: soyDate }, status: 'APPROVED' },
      select: { id: true, type: true, durationMinutes: true, distanceKm: true, pointsEarned: true, startedAt: true },
    }),
    prisma.activity.findMany({
      where: { userId, startedAt: { gte: w12Ago }, status: 'APPROVED' },
      select: { id: true, type: true, durationMinutes: true, distanceKm: true, startedAt: true },
      orderBy: { startedAt: 'asc' },
    }),
  ])

  const sumStats = (acts: typeof weekActivities) => ({
    count: acts.length,
    distance: acts.reduce((s, a) => s + (a.distanceKm ?? 0), 0),
    minutes: acts.reduce((s, a) => s + a.durationMinutes, 0),
    points: acts.reduce((s, a) => s + a.pointsEarned, 0),
  })

  const weeklyBuckets: { weekStart: string; distance: number; minutes: number; count: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const wStart = weeksAgo(i)
    const wEnd = weeksAgo(i - 1)
    const bucket = last12wActivities.filter(a => a.startedAt >= wStart && a.startedAt < wEnd)
    weeklyBuckets.push({
      weekStart: wStart.toISOString().slice(0, 10),
      distance: bucket.reduce((s, a) => s + (a.distanceKm ?? 0), 0),
      minutes: bucket.reduce((s, a) => s + a.durationMinutes, 0),
      count: bucket.length,
    })
  }

  const sportBreakdown: Partial<Record<ActivityType, { count: number; minutes: number; distance: number }>> = {}
  for (const a of monthActivities) {
    if (!sportBreakdown[a.type]) sportBreakdown[a.type] = { count: 0, minutes: 0, distance: 0 }
    sportBreakdown[a.type]!.count++
    sportBreakdown[a.type]!.minutes += a.durationMinutes
    sportBreakdown[a.type]!.distance += a.distanceKm ?? 0
  }

  return {
    profile,
    prs,
    week: sumStats(weekActivities),
    month: sumStats(monthActivities),
    year: sumStats(yearActivities),
    weeklyBuckets,
    sportBreakdown,
  }
}

// ─── Components ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-md ${accent ? 'border-primary-fixed/20 bg-primary-fixed/10' : 'glass-card'}`}>
      <p className="text-label-caps text-on-surface-variant">{label}</p>
      <p className={`mt-xs text-headline-md font-bold ${accent ? 'text-primary-fixed' : 'text-on-surface'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-label-caps text-on-surface-variant">{sub}</p>}
    </div>
  )
}

const SPORT_COLORS: Partial<Record<ActivityType, string>> = {
  RUN: 'bg-primary-fixed',
  WALK: 'bg-primary-fixed-dim',
  CYCLING: 'bg-secondary',
  FOOTBALL_TRAINING: 'bg-[#FFD700]',
  FOOTBALL_MATCH: 'bg-[#FFD700]/70',
  FITNESS: 'bg-secondary-container',
  CUSTOM: 'bg-surface-container-highest',
}

const SPORT_LABELS: Partial<Record<ActivityType, string>> = {
  RUN: 'Running', WALK: 'Walking', CYCLING: 'Cycling',
  FOOTBALL_TRAINING: 'Football Training', FOOTBALL_MATCH: 'Football Match',
  FITNESS: 'Fitness', CUSTOM: 'Custom',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TrainingDashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const data = await getTrainingData(user.id)
  const { profile, prs, week, month, year, weeklyBuckets, sportBreakdown } = data

  const maxWeekDist = Math.max(...weeklyBuckets.map(b => b.distance), 1)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-lg">

      {/* Header */}
      <div className="flex items-center justify-between gap-md">
        <div>
          <h1 className="text-headline-md font-black italic tracking-tight text-primary-fixed">Training Dashboard</h1>
          <p className="mt-xs text-label-caps text-on-surface-variant">Your progress at a glance</p>
        </div>
        <Link
          href="/app/training/calendar"
          className="glass-card rounded-xl px-md py-sm text-label-caps font-bold text-on-surface hover:bg-surface-container-high transition-colors"
        >
          View Calendar
        </Link>
      </div>

      {/* Streaks row */}
      <div className="grid grid-cols-2 gap-sm sm:grid-cols-4">
        <StatCard label="Current Streak"   value={`${profile?.streakDays ?? 0} days`}                           accent />
        <StatCard label="Longest Streak"   value={`${profile?.longestStreak ?? 0} days`} />
        <StatCard label="Total Activities" value={(profile?.totalActivities ?? 0).toString()} />
        <StatCard label="Lifetime Points"  value={(profile?.lifetimePoints ?? 0).toLocaleString()} />
      </div>

      {/* Period stats */}
      <section>
        <h2 className="mb-sm text-label-caps text-on-surface-variant">Period Summary</h2>
        <div className="glass-card rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-md py-sm text-left text-label-caps text-on-surface-variant">Period</th>
                <th className="px-sm py-sm text-right text-label-caps text-on-surface-variant">Activities</th>
                <th className="px-sm py-sm text-right text-label-caps text-on-surface-variant">Distance</th>
                <th className="px-sm py-sm text-right text-label-caps text-on-surface-variant">Time</th>
                <th className="px-sm py-sm text-right text-label-caps text-on-surface-variant">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {([
                ['This Week', week],
                ['This Month', month],
                ['This Year', year],
              ] as [string, typeof week][]).map(([label, stats]) => (
                <tr key={label} className="hover:bg-surface-container-high transition-colors">
                  <td className="px-md py-sm font-bold text-on-surface">{label}</td>
                  <td className="px-sm py-sm text-right text-on-surface">{stats.count}</td>
                  <td className="px-sm py-sm text-right text-on-surface">{formatDistance(stats.distance)}</td>
                  <td className="px-sm py-sm text-right text-on-surface">{formatDuration(stats.minutes)}</td>
                  <td className="px-sm py-sm text-right font-bold text-[#FFD700]">+{stats.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Weekly distance chart */}
      <section>
        <h2 className="mb-sm text-label-caps text-on-surface-variant">Distance — Last 12 Weeks</h2>
        <div className="glass-card rounded-xl p-md">
          <div className="flex h-32 items-end gap-1.5">
            {weeklyBuckets.map((b, i) => {
              const pct = maxWeekDist > 0 ? (b.distance / maxWeekDist) : 0
              const isLast = i === weeklyBuckets.length - 1
              return (
                <div key={b.weekStart} className="flex flex-1 flex-col items-center gap-1" title={`${b.weekStart}: ${b.distance.toFixed(1)} km`}>
                  <div
                    className={`w-full rounded-t-sm transition-all ${isLast ? 'bg-primary-fixed' : 'bg-surface-container-highest'}`}
                    style={{ height: `${Math.max(pct * 100, b.distance > 0 ? 4 : 0)}%` }}
                  />
                </div>
              )
            })}
          </div>
          <div className="mt-sm flex justify-between text-label-caps text-on-surface-variant">
            <span>12 weeks ago</span>
            <span>This week</span>
          </div>
        </div>
      </section>

      {/* Sport breakdown */}
      {Object.keys(sportBreakdown).length > 0 && (
        <section>
          <h2 className="mb-sm text-label-caps text-on-surface-variant">This Month by Sport</h2>
          <div className="grid gap-sm sm:grid-cols-2">
            {(Object.entries(sportBreakdown) as [ActivityType, { count: number; minutes: number; distance: number }][]).map(([type, stats]) => (
              <div key={type} className="glass-card flex items-center gap-md rounded-xl px-md py-sm">
                <span className={`h-3 w-3 shrink-0 rounded-full ${SPORT_COLORS[type] ?? 'bg-surface-container-highest'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-body-md font-bold text-on-surface">{SPORT_LABELS[type] ?? type}</p>
                  <p className="text-label-caps text-on-surface-variant">
                    {stats.count} {stats.count === 1 ? 'session' : 'sessions'} · {formatDuration(stats.minutes)}
                    {stats.distance > 0 ? ` · ${formatDistance(stats.distance)}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Personal Records */}
      <section>
        <h2 className="mb-sm text-label-caps text-on-surface-variant">Personal Records</h2>
        {prs.length === 0 ? (
          <div className="glass-card rounded-xl p-md py-10 text-center">
            <p className="text-label-caps text-on-surface-variant">No personal records yet.</p>
            <p className="mt-xs text-label-caps text-on-surface-variant">Log activities to start tracking PRs.</p>
            <Link
              href="/app/activities/new"
              className="mt-md inline-block rounded-xl bg-primary-fixed px-md py-sm text-label-caps font-bold text-on-primary-fixed hover:bg-primary-fixed-dim transition-colors"
            >
              Log Activity
            </Link>
          </div>
        ) : (
          <div className="grid gap-sm sm:grid-cols-2 lg:grid-cols-3">
            {prs.map(pr => {
              const meta = PR_LABELS[pr.type]
              return (
                <div key={pr.id} className="glass-card rounded-xl border border-[#FFD700]/20 p-md">
                  <div className="flex items-center gap-2">
                    <span
                      className="material-symbols-outlined text-[#FFD700]"
                      style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
                    >
                      emoji_events
                    </span>
                    <p className="text-label-caps text-[#FFD700]">{meta?.label ?? pr.type}</p>
                  </div>
                  <p className="mt-sm text-stats-xl font-bold text-on-surface">
                    {meta ? meta.format(pr.value) : pr.value.toFixed(2)}
                  </p>
                  <p className="mt-xs text-label-caps text-on-surface-variant">
                    Set {new Date(pr.recordedAt).toLocaleDateString()}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Quick links */}
      <section>
        <h2 className="mb-sm text-label-caps text-on-surface-variant">Quick Links</h2>
        <div className="grid grid-cols-2 gap-sm sm:grid-cols-4">
          {[
            { href: '/app/activities/new', label: 'Log Activity' },
            { href: '/app/segments',       label: 'Segments' },
            { href: '/app/routes',         label: 'Routes' },
            { href: '/app/training/calendar', label: 'Calendar' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="glass-card rounded-xl p-sm text-center text-label-caps font-bold text-on-surface transition-colors hover:bg-surface-container-high"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

    </div>
  )
}
