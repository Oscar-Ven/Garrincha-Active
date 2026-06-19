import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  TrendingUp,
  Footprints,
  Bike,
  Trophy,
  Dumbbell,
  Heart,
  Activity,
  Zap,
  Moon,
} from 'lucide-react'
import { ActivityType, Level } from '@/generated/prisma'

export const metadata = { title: 'Training Plan' }

// ─── Types ────────────────────────────────────────────────────────────────────

type Effort = 'Easy' | 'Moderate' | 'Hard' | 'Rest'

interface Session {
  day: string
  type: ActivityType | 'REST'
  effort: Effort
  duration: number // minutes
  notes: string
}

interface Week {
  weekNumber: number
  label: string
  sessions: Session[]
  totalMinutes: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const EFFORT_COLORS: Record<Effort, string> = {
  Easy: 'text-green-400 bg-green-900/30 border-green-700/40',
  Moderate: 'text-yellow-400 bg-yellow-900/30 border-yellow-700/40',
  Hard: 'text-red-400 bg-red-900/30 border-red-700/40',
  Rest: 'text-slate-500 bg-slate-800/50 border-slate-700/40',
}

const LEVEL_LABEL: Record<Level, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Silver',
  GOLD: 'Gold',
  ELITE: 'Elite',
}

// ─── Activity icon helper ─────────────────────────────────────────────────────

function ActivityIcon({ type }: { type: ActivityType | 'REST' }) {
  const cls = 'h-4 w-4 shrink-0'
  if (type === 'REST') return <Moon className={cls} />
  switch (type) {
    case 'RUN':
      return <Footprints className={cls} />
    case 'CYCLING':
      return <Bike className={cls} />
    case 'FOOTBALL_TRAINING':
    case 'FOOTBALL_MATCH':
      return <Trophy className={cls} />
    case 'FITNESS':
      return <Dumbbell className={cls} />
    case 'WALK':
      return <Heart className={cls} />
    default:
      return <Activity className={cls} />
  }
}

// ─── Plan generator ───────────────────────────────────────────────────────────

function generatePlan(
  level: Level,
  dominantType: ActivityType,
  baseWeeklyMinutes: number,
): Week[] {
  // Ensure at least a sensible base
  const base = Math.max(baseWeeklyMinutes, 60)

  type DayTemplate = { effort: Effort; durationRatio: number; notes: string }

  const templates: Record<Level, DayTemplate[]> = {
    BRONZE: [
      // 3 sessions + 4 rest
      { effort: 'Easy', durationRatio: 0.33, notes: 'Conversational pace, breathe easy' },
      { effort: 'Rest', durationRatio: 0, notes: 'Full rest or gentle stretching' },
      { effort: 'Easy', durationRatio: 0.33, notes: 'Focus on form and consistency' },
      { effort: 'Rest', durationRatio: 0, notes: 'Recovery day' },
      { effort: 'Easy', durationRatio: 0.34, notes: 'Slightly longer — enjoy the movement' },
      { effort: 'Rest', durationRatio: 0, notes: 'Rest' },
      { effort: 'Rest', durationRatio: 0, notes: 'Rest' },
    ],
    SILVER: [
      // 4 sessions
      { effort: 'Easy', durationRatio: 0.25, notes: 'Easy effort — aerobic base' },
      { effort: 'Rest', durationRatio: 0, notes: 'Rest or yoga' },
      { effort: 'Moderate', durationRatio: 0.28, notes: 'Tempo effort — comfortably hard' },
      { effort: 'Easy', durationRatio: 0.22, notes: 'Recovery run/session' },
      { effort: 'Rest', durationRatio: 0, notes: 'Rest' },
      { effort: 'Moderate', durationRatio: 0.25, notes: 'Long easy session — build endurance' },
      { effort: 'Rest', durationRatio: 0, notes: 'Rest' },
    ],
    GOLD: [
      // 5 sessions
      { effort: 'Easy', durationRatio: 0.18, notes: 'Easy aerobic effort' },
      { effort: 'Hard', durationRatio: 0.2, notes: 'Intervals: 6×3 min at hard effort, 2 min recovery' },
      { effort: 'Easy', durationRatio: 0.15, notes: 'Easy recovery session' },
      { effort: 'Moderate', durationRatio: 0.2, notes: 'Steady-state tempo effort' },
      { effort: 'Rest', durationRatio: 0, notes: 'Full rest' },
      { effort: 'Easy', durationRatio: 0.27, notes: 'Long session — easy conversational pace' },
      { effort: 'Rest', durationRatio: 0, notes: 'Rest or light stretching' },
    ],
    ELITE: [
      // 6 sessions — periodized hard/easy
      { effort: 'Easy', durationRatio: 0.15, notes: 'Activation — easy warm-up effort' },
      { effort: 'Hard', durationRatio: 0.2, notes: 'VO2max intervals: 8×2 min hard, 90 s recovery' },
      { effort: 'Easy', durationRatio: 0.12, notes: 'Recovery jog/ride' },
      { effort: 'Hard', durationRatio: 0.18, notes: 'Threshold run: 20 min @ lactate threshold' },
      { effort: 'Easy', durationRatio: 0.13, notes: 'Easy shakeout — flush the legs' },
      { effort: 'Moderate', durationRatio: 0.22, notes: 'Long progressive run — finish at moderate pace' },
      { effort: 'Rest', durationRatio: 0, notes: 'Full rest — mandatory recovery' },
    ],
  }

  const weekMultipliers = [1, 1.1, 1.2, 0.8] // W1, W2, W3, W4(recovery)
  const weekLabels = ['Base', 'Build', 'Peak', 'Recovery']

  return weekMultipliers.map((multiplier, wi) => {
    const weekMinutes = Math.round(base * multiplier)
    const tmpl = templates[level]

    const sessions: Session[] = DAYS.map((day, di) => {
      const t = tmpl[di]
      const duration = t.durationRatio > 0 ? Math.max(20, Math.round(weekMinutes * t.durationRatio)) : 0
      return {
        day,
        type: t.effort === 'Rest' ? 'REST' : dominantType,
        effort: t.effort,
        duration,
        notes: t.notes,
      }
    })

    const totalMinutes = sessions.reduce((s, sess) => s + sess.duration, 0)

    return {
      weekNumber: wi + 1,
      label: weekLabels[wi],
      sessions,
      totalMinutes,
    }
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TrainingPlanPage() {
  const session = await getCurrentUser()
  if (!session) redirect('/login')

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [profile, recentActivities] = await Promise.all([
    prisma.playerProfile.findUnique({
      where: { userId: session.id },
      select: { level: true, streakDays: true, totalPoints: true },
    }),
    prisma.activity.findMany({
      where: {
        userId: session.id,
        status: 'APPROVED',
        startedAt: { gte: thirtyDaysAgo },
      },
      select: { type: true, durationMinutes: true, distanceKm: true, startedAt: true },
      orderBy: { startedAt: 'desc' },
    }),
  ])

  const level: Level = profile?.level ?? 'BRONZE'
  const streakDays = profile?.streakDays ?? 0

  // Dominant activity type
  const typeCounts: Partial<Record<ActivityType, number>> = {}
  let totalMinutes = 0
  let totalDistanceKm = 0

  for (const act of recentActivities) {
    typeCounts[act.type] = (typeCounts[act.type] ?? 0) + 1
    totalMinutes += act.durationMinutes
    totalDistanceKm += act.distanceKm ?? 0
  }

  const dominantType: ActivityType =
    (Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as ActivityType) ?? 'RUN'

  // Weekly average (from 30 days = ~4.3 weeks)
  const weeklyMinutes = Math.round(totalMinutes / 4.3)
  const weeklyKm = (totalDistanceKm / 4.3).toFixed(1)

  const plan = generatePlan(level, dominantType, weeklyMinutes)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <TrendingUp className="h-6 w-6 text-green-400" /> 4-Week Training Plan
      </h1>

      {/* Summary card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Level', value: LEVEL_LABEL[level] },
          { label: 'Weekly avg', value: `${weeklyMinutes} min` },
          { label: 'Weekly km', value: `${weeklyKm} km` },
          { label: 'Streak', value: `${streakDays} days` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-center">
            <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
            <p className="text-lg font-bold text-white mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {recentActivities.length === 0 && (
        <div className="rounded-xl bg-yellow-900/20 border border-yellow-700/40 px-4 py-3 text-sm text-yellow-300 flex items-center gap-2">
          <Zap className="h-4 w-4 shrink-0" />
          No activities in the last 30 days — plan is based on recommended minimums for your level.
        </div>
      )}

      {/* Weekly calendar grid */}
      {plan.map((week) => (
        <Card key={week.weekNumber} className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-base">
                Week {week.weekNumber} — {week.label}
              </CardTitle>
              <span className="text-xs text-slate-400">{week.totalMinutes} min total</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1.5">
              {week.sessions.map((sess) => (
                <div
                  key={sess.day}
                  className={`rounded-lg border p-2 flex flex-col gap-1 min-h-[96px] ${EFFORT_COLORS[sess.effort]}`}
                  title={sess.notes}
                >
                  <span className="text-[11px] font-semibold text-slate-300">{sess.day}</span>
                  <div className="flex items-center justify-center flex-1">
                    <ActivityIcon type={sess.type} />
                  </div>
                  <span className="text-[10px] font-medium text-center leading-tight">
                    {sess.effort}
                  </span>
                  {sess.duration > 0 && (
                    <span className="text-[10px] text-center text-slate-300">
                      {sess.duration} min
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Session notes list */}
            <div className="mt-3 space-y-1">
              {week.sessions
                .filter((s) => s.effort !== 'Rest')
                .map((sess, i) => (
                  <p key={i} className="text-xs text-slate-400 flex gap-2">
                    <span className="font-semibold text-slate-300 w-7 shrink-0">{sess.day}</span>
                    <span>{sess.notes}</span>
                  </p>
                ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {(Object.entries(EFFORT_COLORS) as [Effort, string][]).map(([effort, cls]) => (
          <span key={effort} className={`px-2 py-1 rounded border font-medium ${cls}`}>
            {effort}
          </span>
        ))}
      </div>
    </div>
  )
}
