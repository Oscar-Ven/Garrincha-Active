import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { activityTypeIcon, activityTypeLabel, formatDuration, formatDistance } from '@/lib/utils'
import { ActivityType } from '@/generated/prisma'

export const metadata: Metadata = {
  title: 'Training Calendar',
  description: 'Your activity history in calendar view',
}

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getCalendarData(userId: string, year: number, month: number) {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59)

  const activities = await prisma.activity.findMany({
    where: { userId, startedAt: { gte: start, lte: end }, status: 'APPROVED' },
    select: {
      id: true, title: true, type: true, startedAt: true,
      durationMinutes: true, distanceKm: true, pointsEarned: true,
    },
    orderBy: { startedAt: 'asc' },
  })

  // Group by day
  const byDay: Record<number, typeof activities> = {}
  for (const a of activities) {
    const d = new Date(a.startedAt).getDate()
    if (!byDay[d]) byDay[d] = []
    byDay[d].push(a)
  }

  return { activities, byDay }
}

// ─── Calendar helpers ─────────────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const DAY_NAMES_SHORT = ['S','M','T','W','T','F','S']

const TYPE_DOT: Partial<Record<ActivityType, string>> = {
  RUN: 'bg-green-500', WALK: 'bg-teal-500', CYCLING: 'bg-blue-500',
  FOOTBALL_TRAINING: 'bg-amber-500', FOOTBALL_MATCH: 'bg-orange-500',
  FITNESS: 'bg-purple-500', CUSTOM: 'bg-slate-400',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TrainingCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const sp = await searchParams
  const now = new Date()
  const year = parseInt(sp.y ?? String(now.getFullYear()), 10) || now.getFullYear()
  const month = parseInt(sp.m ?? String(now.getMonth() + 1), 10) || now.getMonth() + 1

  const { activities, byDay } = await getCalendarData(user.id, year, month)

  // Calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()

  const prevYear = month === 1 ? year - 1 : year
  const prevMonth = month === 1 ? 12 : month - 1
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1

  const totalDist = activities.reduce((s, a) => s + (a.distanceKm ?? 0), 0)
  const totalMins = activities.reduce((s, a) => s + a.durationMinutes, 0)

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6">

      {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/app/training"
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Training Calendar</h1>
            <p className="text-sm text-slate-400">
              {activities.length} activities · {formatDistance(totalDist)} · {formatDuration(totalMins)}
            </p>
          </div>
        </div>

        {/* Month navigation */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            href={`/app/training/calendar?y=${prevYear}&m=${prevMonth}`}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
          >
            ← Prev
          </Link>
          <h2 className="text-lg font-semibold text-white">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <Link
            href={`/app/training/calendar?y=${nextYear}&m=${nextMonth}`}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
          >
            Next →
          </Link>
        </div>

        {/* Calendar grid */}
        <div className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-700">
            {DAY_NAMES.map((d, i) => (
              <div key={d} className="py-2 text-center text-xs font-medium uppercase tracking-wide text-slate-400">
                <span className="hidden sm:inline">{d}</span>
                <span className="sm:hidden">{DAY_NAMES_SHORT[i]}</span>
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-16 border-b border-r border-slate-700/50 bg-slate-800/30" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dayActs = byDay[day] ?? []
              const isToday = now.getFullYear() === year && now.getMonth() + 1 === month && now.getDate() === day

              return (
                <div
                  key={day}
                  className={`min-h-16 border-b border-r border-slate-700/50 p-1.5 ${isToday ? 'bg-green-900/20' : ''}`}
                >
                  <span className={`text-xs font-medium ${isToday ? 'rounded-full bg-green-600 px-1.5 py-0.5 text-white' : 'text-slate-400'}`}>
                    {day}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayActs.map(a => (
                      <Link
                        key={a.id}
                        href={`/app/activities/${a.id}`}
                        className="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-white/10"
                        title={a.title}
                      >
                        <span className={`h-2 w-2 shrink-0 rounded-full ${TYPE_DOT[a.type] ?? 'bg-slate-400'}`} />
                        <span className="truncate text-[10px] text-slate-300">{a.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Activity list for the month */}
        {activities.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              All Activities — {MONTH_NAMES[month - 1]} {year}
            </h2>
            <div className="space-y-2">
              {activities.map(a => (
                <Link
                  key={a.id}
                  href={`/app/activities/${a.id}`}
                  className="flex items-center gap-4 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 transition-colors hover:bg-slate-700"
                >
                  <span className={`h-3 w-3 shrink-0 rounded-full ${TYPE_DOT[a.type] ?? 'bg-slate-400'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-100">{a.title}</p>
                    <p className="text-xs text-slate-500">
                      {activityTypeLabel(a.type)} · {new Date(a.startedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-slate-400">
                    <p>{formatDuration(a.durationMinutes)}</p>
                    {a.distanceKm && <p>{formatDistance(a.distanceKm)}</p>}
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-yellow-400">+{a.pointsEarned}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {activities.length === 0 && (
          <div className="mt-8 rounded-xl border border-slate-700 bg-slate-800 px-6 py-12 text-center">
            <p className="text-slate-400">No activities in {MONTH_NAMES[month - 1]} {year}.</p>
            <Link href="/app/activities/new" className="mt-4 inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
              Log an Activity
            </Link>
          </div>
        )}

    </div>
  )
}
