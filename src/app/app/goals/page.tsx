import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { GoalType, GoalPeriod } from '@/generated/prisma'
import { createGoal, deleteGoal, toggleGoal } from './actions'

export const metadata: Metadata = {
  title: 'Goals | Garrincha Active',
  description: 'Set and track your personal fitness goals',
}

const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  DISTANCE: 'Distance (km)',
  DURATION: 'Duration (min)',
  ACTIVITY_COUNT: 'Activities',
  POINTS: 'Points',
}

const GOAL_TYPE_ICONS: Record<GoalType, string> = {
  DISTANCE: '📍',
  DURATION: '⏱️',
  ACTIVITY_COUNT: '🏃',
  POINTS: '⭐',
}

const PERIOD_LABELS: Record<GoalPeriod, string> = {
  WEEKLY: 'This week',
  MONTHLY: 'This month',
  CUSTOM: 'Custom',
}

async function computeProgress(
  userId: string,
  type: GoalType,
  startDate: Date,
  endDate: Date,
): Promise<number> {
  const range = { gte: startDate, lte: endDate }

  if (type === 'DISTANCE') {
    const result = await prisma.activity.aggregate({
      where: { userId, status: 'APPROVED', startedAt: range },
      _sum: { distanceKm: true },
    })
    return result._sum.distanceKm ?? 0
  }
  if (type === 'DURATION') {
    const result = await prisma.activity.aggregate({
      where: { userId, status: 'APPROVED', startedAt: range },
      _sum: { durationMinutes: true },
    })
    return result._sum.durationMinutes ?? 0
  }
  if (type === 'ACTIVITY_COUNT') {
    return prisma.activity.count({ where: { userId, status: 'APPROVED', startedAt: range } })
  }
  // POINTS
  const result = await prisma.pointsLedger.aggregate({
    where: { userId, points: { gt: 0 }, createdAt: range },
    _sum: { points: true },
  })
  return result._sum.points ?? 0
}

export default async function GoalsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
  })

  const goalsWithProgress = await Promise.all(
    goals.map(async (g) => ({
      ...g,
      current: await computeProgress(user.id, g.type, g.startDate, g.endDate),
    })),
  )

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6 sm:px-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Goals</h1>
          <p className="mt-1 text-sm text-slate-400">
            {goalsWithProgress.filter((g) => g.isActive).length} active goal{goalsWithProgress.filter((g) => g.isActive).length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-600/20 text-2xl">
          🎯
        </div>
      </div>

      {/* Active goals */}
      {goalsWithProgress.filter((g) => g.isActive).length > 0 && (
        <section className="space-y-3">
          {goalsWithProgress.filter((g) => g.isActive).map((goal) => {
            const pct = Math.min(100, goal.targetValue > 0 ? Math.round((goal.current / goal.targetValue) * 100) : 0)
            const done = pct >= 100
            const unit = goal.type === 'DISTANCE' ? 'km' : goal.type === 'DURATION' ? 'min' : goal.type === 'POINTS' ? 'pts' : ''
            return (
              <div
                key={goal.id}
                className={`rounded-2xl border p-5 transition-colors ${done ? 'border-green-500/40 bg-green-500/10' : 'border-slate-700 bg-slate-800'}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{GOAL_TYPE_ICONS[goal.type]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-white">{goal.title}</p>
                      {done && <span className="rounded-full bg-green-600/20 px-2 py-0.5 text-xs font-semibold text-green-400">Completed ✓</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {GOAL_TYPE_LABELS[goal.type]} · {PERIOD_LABELS[goal.period]}
                      {' · '}
                      {new Date(goal.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      {' – '}
                      {new Date(goal.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                    <div className="mt-3 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">
                          {goal.current.toFixed(goal.type === 'ACTIVITY_COUNT' || goal.type === 'POINTS' ? 0 : 1)} {unit}
                          {' / '}
                          {goal.targetValue.toFixed(goal.type === 'ACTIVITY_COUNT' || goal.type === 'POINTS' ? 0 : 1)} {unit}
                        </span>
                        <span className={`font-semibold ${done ? 'text-green-400' : 'text-slate-300'}`}>{pct}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${done ? 'bg-green-500' : 'bg-green-600'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2 border-t border-slate-700/50 pt-3">
                  <form action={toggleGoal.bind(null, goal.id)}>
                    <button type="submit" className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-400 hover:border-slate-400 hover:text-white transition-colors">
                      Pause
                    </button>
                  </form>
                  <form action={deleteGoal.bind(null, goal.id)}>
                    <button type="submit" className="rounded-lg border border-red-700/40 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/20 transition-colors">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {/* Paused goals */}
      {goalsWithProgress.filter((g) => !g.isActive).length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Paused</h2>
          <div className="space-y-2">
            {goalsWithProgress.filter((g) => !g.isActive).map((goal) => {
              const pct = Math.min(100, goal.targetValue > 0 ? Math.round((goal.current / goal.targetValue) * 100) : 0)
              return (
                <div key={goal.id} className="flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-3 opacity-60">
                  <span className="text-lg">{GOAL_TYPE_ICONS[goal.type]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-300">{goal.title}</p>
                    <p className="text-xs text-slate-500">{pct}% · {PERIOD_LABELS[goal.period]}</p>
                  </div>
                  <form action={toggleGoal.bind(null, goal.id)}>
                    <button type="submit" className="shrink-0 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-600 transition-colors">
                      Resume
                    </button>
                  </form>
                  <form action={deleteGoal.bind(null, goal.id)}>
                    <button type="submit" className="shrink-0 text-xs text-red-500 hover:text-red-400 transition-colors">
                      ✕
                    </button>
                  </form>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Empty state */}
      {goals.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/40 px-6 py-12 text-center">
          <div className="mb-3 text-4xl">🎯</div>
          <p className="font-semibold text-slate-200">No goals yet</p>
          <p className="mt-1 text-sm text-slate-500">Set a weekly or monthly target below to get started.</p>
        </div>
      )}

      {/* Create form */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6">
        <h2 className="mb-4 text-base font-semibold text-white">New Goal</h2>
        <form action={createGoal} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Title</label>
            <input
              name="title"
              type="text"
              required
              maxLength={80}
              placeholder="e.g. Run 40km this month"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Type</label>
              <select
                name="type"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="DISTANCE">Distance (km)</option>
                <option value="DURATION">Duration (min)</option>
                <option value="ACTIVITY_COUNT">Activity count</option>
                <option value="POINTS">Points</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Target</label>
              <input
                name="targetValue"
                type="number"
                required
                min={0.1}
                step="0.1"
                placeholder="e.g. 40"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Period</label>
            <select
              name="period"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              <option value="WEEKLY">This week (Mon–Sun)</option>
              <option value="MONTHLY">This month</option>
              <option value="CUSTOM">Custom date range</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Start (custom only)</label>
              <input
                name="customStart"
                type="date"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">End (custom only)</label>
              <input
                name="customEnd"
                type="date"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
          >
            Create Goal
          </button>
        </form>
      </div>

    </div>
  )
}
