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
  const day = d.getDay()
  d.setDate(d.getDate() - day)
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
  FASTEST_1KM:          { label: 'Fastest 1km',       unit: 'min/km', format: (v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` },
  FASTEST_5KM:          { label: 'Fastest 5km',        unit: 'time',   format: (v) => `${Math.floor(v / 60)}m ${v % 60}s` },
  FASTEST_10KM:         { label: 'Fastest 10km',       unit: 'time',   format: (v) => `${Math.floor(v / 60)}m ${v % 60}s` },
  LONGEST_RUN:          { label: 'Longest Run',         unit: 'km',     format: (v) => `${v.toFixed(1)} km` },
  LONGEST_RIDE:         { label: 'Longest Ride',        unit: 'km',     format: (v) => `${v.toFixed(1)} km` },
  MOST_ACTIVITIES_WEEK: { label: 'Most Active Week',    unit: 'activities', format: (v) => `${v} activities` },
}

async function getTrainingData(userId: string) {
  const now = new Date()
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

  // Group last 12 weeks
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

  // Sport breakdown for month
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
    <div className={`rounded-xl border px-5 py-4 ${accent ? 'border-green-600/40 bg-green-600/10' : 'border-slate-700 bg-slate-800'}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ? 'text-green-400' : 'text-white'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

const SPORT_COLORS: Partial<Record<ActivityType, string>> = {
  RUN: 'bg-green-500',
  WALK: 'bg-teal-500',
  CYCLING: 'bg-blue-500',
  FOOTBALL_TRAINING: 'bg-amber-500',
  FOOTBALL_MATCH: 'bg-orange-500',
  FITNESS: 'bg-purple-500',
  CUSTOM: 'bg-slate-500',
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
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Training Dashboard</h1>
            <p className="mt-1 text-sm text-slate-400">Your progress at a glance</p>
          </div>
          <Link
            href="/app/training/calendar"
            className="rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-600 hover:text-white"
          >
            View Calendar
          </Link>
        </div>

        {/* Streaks row */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Current Streak" value={`${profile?.streakDays ?? 0} days`} accent />
          <StatCard label="Longest Streak" value={`${profile?.longestStreak ?? 0} days`} />
          <StatCard label="Total Activities" value={(profile?.totalActivities ?? 0).toString()} />
          <StatCard label="Lifetime Points" value={(profile?.lifetimePoints ?? 0).toLocaleString()} />
        </div>

        {/* Period stats */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Period Summary</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Period</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">Activities</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">Distance</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">Time</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {([
                  ['This Week', week],
                  ['This Month', month],
                  ['This Year', year],
                ] as [string, typeof week][]).map(([label, stats]) => (
                  <tr key={label} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-slate-200">{label}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{stats.count}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{formatDistance(stats.distance)}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{formatDuration(stats.minutes)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-yellow-400">+{stats.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Weekly distance chart */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Distance — Last 12 Weeks</h2>
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <div className="flex h-32 items-end gap-1.5">
              {weeklyBuckets.map((b, i) => {
                const pct = maxWeekDist > 0 ? (b.distance / maxWeekDist) : 0
                const isLast = i === weeklyBuckets.length - 1
                return (
                  <div key={b.weekStart} className="flex flex-1 flex-col items-center gap-1" title={`${b.weekStart}: ${b.distance.toFixed(1)} km`}>
                    <div
                      className={`w-full rounded-t-sm transition-all ${isLast ? 'bg-green-500' : 'bg-slate-600'}`}
                      style={{ height: `${Math.max(pct * 100, b.distance > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>12 weeks ago</span>
              <span>This week</span>
            </div>
          </div>
        </section>

        {/* Sport breakdown */}
        {Object.keys(sportBreakdown).length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">This Month by Sport</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.entries(sportBreakdown) as [ActivityType, { count: number; minutes: number; distance: number }][]).map(([type, stats]) => (
                <div key={type} className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3">
                  <span className={`h-3 w-3 rounded-full ${SPORT_COLORS[type] ?? 'bg-slate-500'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-200">{SPORT_LABELS[type] ?? type}</p>
                    <p className="text-xs text-slate-500">
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
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Personal Records</h2>
          </div>
          {prs.length === 0 ? (
            <div className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-10 text-center">
              <p className="text-slate-400">No personal records yet.</p>
              <p className="mt-1 text-sm text-slate-500">Log activities to start tracking PRs.</p>
              <Link href="/app/activities/new" className="mt-4 inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                Log Activity
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {prs.map(pr => {
                const meta = PR_LABELS[pr.type]
                return (
                  <div key={pr.id} className="rounded-xl border border-yellow-600/30 bg-yellow-600/5 px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏆</span>
                      <p className="text-xs font-medium uppercase tracking-wide text-yellow-500">{meta?.label ?? pr.type}</p>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-white">
                      {meta ? meta.format(pr.value) : pr.value.toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
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
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Quick Links</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { href: '/app/activities/new', label: 'Log Activity' },
              { href: '/app/segments', label: 'Segments' },
              { href: '/app/routes', label: 'Routes' },
              { href: '/app/training/calendar', label: 'Calendar' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-center text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
              >
                {label}
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
