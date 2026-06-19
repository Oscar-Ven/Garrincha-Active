import { ActivityType } from '@/generated/prisma'

export type WellnessBreakdown = {
  total: number
  consistency: number   // 0-30: activities per week vs target
  variety: number       // 0-25: different sport types
  improvement: number   // 0-25: pace/distance trend
  social: number        // 0-20: kudos + comments + follows
}

export type TrainingLoad = {
  score: number         // 0-100
  status: 'Fresh' | 'Optimal' | 'Fatigued' | 'Overreached'
  color: string
  recentMinutes: number
  baselineMinutes: number
}

type ActivityMinimal = {
  startedAt: Date
  durationMinutes: number
  type: ActivityType
  distanceKm: number | null
  paceMinPerKm: number | null
}

const SPORT_TYPES = Object.values(ActivityType)

export function computeWellnessScore(
  recentActivities: ActivityMinimal[],   // last 28 days
  allActivities: ActivityMinimal[],       // last 90 days for trend
  kudosGiven: number,
  followingCount: number,
): WellnessBreakdown {
  const now = Date.now()
  const day = 86_400_000

  // ── Consistency (0-30): active days / 28 days * 30 ──────────────────────────
  const activeDays = new Set(
    recentActivities.map((a) =>
      Math.floor((now - a.startedAt.getTime()) / day),
    ),
  ).size
  const consistency = Math.round(Math.min(30, (activeDays / 20) * 30))

  // ── Variety (0-25): unique sport types in last 28 days / total types ─────────
  const uniqueTypes = new Set(recentActivities.map((a) => a.type)).size
  const variety = Math.round(Math.min(25, (uniqueTypes / Math.min(SPORT_TYPES.length, 4)) * 25))

  // ── Improvement (0-25): pace trend for RUN/CYCLING ──────────────────────────
  const paceActivities = allActivities
    .filter((a) => (a.type === ActivityType.RUN || a.type === ActivityType.CYCLING) && a.paceMinPerKm)
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())

  let improvement = 12 // neutral baseline
  if (paceActivities.length >= 4) {
    const older = paceActivities.slice(0, Math.floor(paceActivities.length / 2))
    const newer = paceActivities.slice(Math.floor(paceActivities.length / 2))
    const avgOlder = older.reduce((s, a) => s + a.paceMinPerKm!, 0) / older.length
    const avgNewer = newer.reduce((s, a) => s + a.paceMinPerKm!, 0) / newer.length
    // Lower pace = faster = improvement
    const improvePct = (avgOlder - avgNewer) / avgOlder
    improvement = Math.round(Math.min(25, Math.max(0, 12 + improvePct * 100)))
  }

  // ── Social (0-20): engagement signals ────────────────────────────────────────
  const social = Math.round(Math.min(20, kudosGiven * 0.5 + followingCount * 0.3))

  const total = Math.min(100, consistency + variety + improvement + social)
  return { total, consistency, variety, improvement, social }
}

export function computeTrainingLoad(
  last7Days: ActivityMinimal[],
  last28Days: ActivityMinimal[],
): TrainingLoad {
  const recentMinutes = last7Days.reduce((s, a) => s + a.durationMinutes, 0)
  const baselineMinutes = last28Days.length > 0
    ? Math.round(last28Days.reduce((s, a) => s + a.durationMinutes, 0) / 4)
    : 0

  const ratio = baselineMinutes > 0 ? recentMinutes / baselineMinutes : 0
  const score = Math.round(Math.min(100, ratio * 60))

  let status: TrainingLoad['status']
  let color: string
  if (ratio < 0.5) {
    status = 'Fresh'; color = 'text-blue-400'
  } else if (ratio <= 1.3) {
    status = 'Optimal'; color = 'text-green-400'
  } else if (ratio <= 1.7) {
    status = 'Fatigued'; color = 'text-yellow-400'
  } else {
    status = 'Overreached'; color = 'text-red-400'
  }

  return { score, status, color, recentMinutes, baselineMinutes }
}
