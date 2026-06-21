import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { GoalType, GoalPeriod } from '@/generated/prisma'
import { createGoal, deleteGoal, toggleGoal } from './actions'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Goals | GG',
  description: 'Set and track your personal fitness goals',
}

const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  DISTANCE: 'Distance (km)',
  DURATION: 'Duration (min)',
  ACTIVITY_COUNT: 'Activities',
  POINTS: 'Points',
}

const GOAL_TYPE_ICONS: Record<GoalType, string> = {
  DISTANCE: 'place',
  DURATION: 'schedule',
  ACTIVITY_COUNT: 'sports_kabaddi',
  POINTS: 'stars',
}

const PERIOD_LABELS: Record<GoalPeriod, string> = {
  WEEKLY: 'This week',
  MONTHLY: 'This month',
  CUSTOM: 'Custom',
}

async function computeProgress(userId: string, type: GoalType, startDate: Date, endDate: Date): Promise<number> {
  const range = { gte: startDate, lte: endDate }
  if (type === 'DISTANCE') {
    const r = await prisma.activity.aggregate({ where: { userId, status: 'APPROVED', startedAt: range }, _sum: { distanceKm: true } })
    return r._sum.distanceKm ?? 0
  }
  if (type === 'DURATION') {
    const r = await prisma.activity.aggregate({ where: { userId, status: 'APPROVED', startedAt: range }, _sum: { durationMinutes: true } })
    return r._sum.durationMinutes ?? 0
  }
  if (type === 'ACTIVITY_COUNT') {
    return prisma.activity.count({ where: { userId, status: 'APPROVED', startedAt: range } })
  }
  const r = await prisma.pointsLedger.aggregate({ where: { userId, points: { gt: 0 }, createdAt: range }, _sum: { points: true } })
  return r._sum.points ?? 0
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

  const activeGoals = goalsWithProgress.filter((g) => g.isActive)
  const pausedGoals = goalsWithProgress.filter((g) => !g.isActive)

  return (
    <div className="max-w-xl mx-auto space-y-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-md font-black italic tracking-tight text-primary-fixed">My Goals</h1>
          <p className="text-label-caps text-on-surface-variant mt-xs">
            {activeGoals.length} active goal{activeGoals.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary-fixed/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary-fixed" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>
            track_changes
          </span>
        </div>
      </div>

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <section className="space-y-sm">
          {activeGoals.map((goal) => {
            const pct = Math.min(100, goal.targetValue > 0 ? Math.round((goal.current / goal.targetValue) * 100) : 0)
            const done = pct >= 100
            const unit = goal.type === 'DISTANCE' ? 'km' : goal.type === 'DURATION' ? 'min' : goal.type === 'POINTS' ? 'pts' : ''
            return (
              <div
                key={goal.id}
                className={cn(
                  'glass-card rounded-xl p-md border-l-4 transition-colors',
                  done ? 'border-l-primary-fixed' : 'border-l-secondary',
                )}
              >
                <div className="flex items-start gap-md">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                    done ? 'bg-primary-fixed/10' : 'bg-secondary/10',
                  )}>
                    <span
                      className={cn('material-symbols-outlined', done ? 'text-primary-fixed' : 'text-secondary')}
                      style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
                    >
                      {GOAL_TYPE_ICONS[goal.type]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-xs">
                      <p className="text-body-md font-bold text-white">{goal.title}</p>
                      {done && (
                        <span className="text-label-caps text-primary-fixed bg-primary-fixed/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="material-symbols-outlined" style={{ fontSize: '12px', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          Done
                        </span>
                      )}
                    </div>
                    <p className="text-label-caps text-on-surface-variant">
                      {GOAL_TYPE_LABELS[goal.type]} · {PERIOD_LABELS[goal.period]}
                      {' · '}
                      {new Date(goal.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      {' – '}
                      {new Date(goal.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                    <div className="mt-sm space-y-xs">
                      <div className="flex justify-between">
                        <span className="text-label-caps text-on-surface-variant">
                          {goal.current.toFixed(goal.type === 'ACTIVITY_COUNT' || goal.type === 'POINTS' ? 0 : 1)} {unit}
                          {' / '}
                          {goal.targetValue.toFixed(goal.type === 'ACTIVITY_COUNT' || goal.type === 'POINTS' ? 0 : 1)} {unit}
                        </span>
                        <span className={cn('text-label-caps font-black', done ? 'text-primary-fixed' : 'text-secondary')}>{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500', done ? 'bg-primary-fixed' : 'bg-secondary')}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-md flex gap-sm pt-sm border-t border-white/5">
                  <form action={toggleGoal.bind(null, goal.id)}>
                    <button type="submit" className="text-label-caps text-on-surface-variant border border-white/10 px-md py-xs rounded-lg hover:border-white/30 hover:text-on-surface transition-colors">
                      Pause
                    </button>
                  </form>
                  <form action={deleteGoal.bind(null, goal.id)}>
                    <button type="submit" className="text-label-caps text-error border border-error/20 px-md py-xs rounded-lg hover:bg-error/10 transition-colors">
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
      {pausedGoals.length > 0 && (
        <section className="space-y-sm">
          <h2 className="text-label-caps text-on-surface-variant">Paused</h2>
          {pausedGoals.map((goal) => {
            const pct = Math.min(100, goal.targetValue > 0 ? Math.round((goal.current / goal.targetValue) * 100) : 0)
            return (
              <div key={goal.id} className="glass-card rounded-xl p-md flex items-center gap-md opacity-60">
                <span
                  className="material-symbols-outlined text-on-surface-variant shrink-0"
                  style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
                >
                  {GOAL_TYPE_ICONS[goal.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-body-md font-bold text-on-surface truncate">{goal.title}</p>
                  <p className="text-label-caps text-on-surface-variant">{pct}% · {PERIOD_LABELS[goal.period]}</p>
                </div>
                <div className="flex items-center gap-xs shrink-0">
                  <form action={toggleGoal.bind(null, goal.id)}>
                    <button type="submit" className="glass-card px-md py-xs rounded-lg text-label-caps text-on-surface-variant hover:text-on-surface transition-colors">
                      Resume
                    </button>
                  </form>
                  <form action={deleteGoal.bind(null, goal.id)}>
                    <button type="submit" className="text-error text-label-caps hover:opacity-80">
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                    </button>
                  </form>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {/* Empty state */}
      {goals.length === 0 && (
        <div className="glass-card rounded-xl p-md py-12 flex flex-col items-center text-center border border-dashed border-white/10">
          <span className="material-symbols-outlined text-on-surface-variant mb-sm" style={{ fontSize: '40px' }}>track_changes</span>
          <p className="text-body-md font-bold text-on-surface">No goals yet</p>
          <p className="text-label-caps text-on-surface-variant mt-xs">Set a weekly or monthly target below to get started.</p>
        </div>
      )}

      {/* Create form */}
      <div className="glass-card rounded-xl p-md space-y-md">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary-fixed" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>add_circle</span>
          <h2 className="text-headline-md text-on-surface">New Goal</h2>
        </div>
        <form action={createGoal} className="space-y-md">
          <div className="space-y-xs">
            <label className="text-label-caps text-on-surface-variant">Title</label>
            <div className="glass-card rounded-xl px-md py-sm">
              <input
                name="title"
                type="text"
                required
                maxLength={80}
                placeholder="e.g. Play 10 padel matches this month"
                className="w-full bg-transparent text-on-surface text-body-md outline-none border-none placeholder:text-on-surface-variant"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xs">
              <label className="text-label-caps text-on-surface-variant">Type</label>
              <div className="glass-card rounded-xl px-md py-sm">
                <select
                  name="type"
                  required
                  className="w-full bg-transparent text-on-surface text-body-md outline-none border-none focus:ring-0"
                >
                  <option value="DISTANCE" className="bg-surface-container-highest">Distance (km)</option>
                  <option value="DURATION" className="bg-surface-container-highest">Duration (min)</option>
                  <option value="ACTIVITY_COUNT" className="bg-surface-container-highest">Activity count</option>
                  <option value="POINTS" className="bg-surface-container-highest">Points</option>
                </select>
              </div>
            </div>
            <div className="space-y-xs">
              <label className="text-label-caps text-on-surface-variant">Target</label>
              <div className="glass-card rounded-xl px-md py-sm">
                <input
                  name="targetValue"
                  type="number"
                  required
                  min={0.1}
                  step="0.1"
                  placeholder="e.g. 10"
                  className="w-full bg-transparent text-on-surface text-body-md outline-none border-none placeholder:text-on-surface-variant"
                />
              </div>
            </div>
          </div>

          <div className="space-y-xs">
            <label className="text-label-caps text-on-surface-variant">Period</label>
            <div className="glass-card rounded-xl px-md py-sm">
              <select
                name="period"
                required
                className="w-full bg-transparent text-on-surface text-body-md outline-none border-none focus:ring-0"
              >
                <option value="WEEKLY" className="bg-surface-container-highest">This week (Mon–Sun)</option>
                <option value="MONTHLY" className="bg-surface-container-highest">This month</option>
                <option value="CUSTOM" className="bg-surface-container-highest">Custom date range</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xs">
              <label className="text-label-caps text-on-surface-variant">Start (custom)</label>
              <div className="glass-card rounded-xl px-md py-sm">
                <input
                  name="customStart"
                  type="date"
                  className="w-full bg-transparent text-on-surface text-body-md outline-none border-none scheme-dark"
                />
              </div>
            </div>
            <div className="space-y-xs">
              <label className="text-label-caps text-on-surface-variant">End (custom)</label>
              <div className="glass-card rounded-xl px-md py-sm">
                <input
                  name="customEnd"
                  type="date"
                  className="w-full bg-transparent text-on-surface text-body-md outline-none border-none scheme-dark"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-primary-fixed text-on-primary-fixed py-4 rounded-xl font-bold text-label-caps action-glow hover:scale-[1.02] active:scale-95 transition-all"
          >
            Create Goal
          </button>
        </form>
      </div>
    </div>
  )
}
