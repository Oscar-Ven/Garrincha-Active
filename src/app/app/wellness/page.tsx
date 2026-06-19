import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { computeWellnessScore, computeTrainingLoad } from '@/lib/wellness'
import { ActivityType } from '@/generated/prisma'
import { Leaf, TrendingUp, Users, Zap, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buyStreakShield } from '@/app/app/feed/actions'

export const metadata = { title: 'Wellness | Garrincha Active' }

const STATUS_COLORS = {
  Fresh: 'bg-blue-600',
  Optimal: 'bg-green-600',
  Fatigued: 'bg-yellow-500',
  Overreached: 'bg-red-600',
}

const WELLNESS_GRADE = (score: number) => {
  if (score >= 80) return { label: 'Excellent', color: 'text-green-400' }
  if (score >= 60) return { label: 'Good', color: 'text-blue-400' }
  if (score >= 40) return { label: 'Fair', color: 'text-yellow-400' }
  return { label: 'Needs Work', color: 'text-red-400' }
}

function ScoreRing({ score }: { score: number }) {
  const radius = 54
  const circ = 2 * Math.PI * radius
  const dash = (score / 100) * circ
  return (
    <svg width="140" height="140" className="rotate-[-90deg]">
      <circle cx="70" cy="70" r={radius} fill="none" stroke="#1e293b" strokeWidth="12" />
      <circle
        cx="70" cy="70" r={radius} fill="none"
        stroke={score >= 60 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444'}
        strokeWidth="12" strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round" className="transition-all duration-700"
      />
    </svg>
  )
}

function BreakdownBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="font-semibold text-white">{value}/{max}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-700">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  )
}

export default async function WellnessPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const now = new Date()
  const day7 = new Date(now.getTime() - 7 * 86_400_000)
  const day28 = new Date(now.getTime() - 28 * 86_400_000)
  const day90 = new Date(now.getTime() - 90 * 86_400_000)

  const [profile, activities90, kudosGiven, followingCount] = await Promise.all([
    prisma.playerProfile.findUnique({ where: { userId: user.id } }),
    prisma.activity.findMany({
      where: { userId: user.id, status: 'APPROVED', startedAt: { gte: day90 } },
      select: { startedAt: true, durationMinutes: true, type: true, distanceKm: true, paceMinPerKm: true },
      orderBy: { startedAt: 'desc' },
    }),
    prisma.feedReaction.count({ where: { userId: user.id } }),
    prisma.follow.count({ where: { followerId: user.id } }),
  ])

  const activities28 = activities90.filter((a) => a.startedAt >= day28)
  const activities7 = activities90.filter((a) => a.startedAt >= day7)

  const wellness = computeWellnessScore(
    activities28.map((a) => ({ ...a, type: a.type as ActivityType })),
    activities90.map((a) => ({ ...a, type: a.type as ActivityType })),
    kudosGiven,
    followingCount,
  )

  const load = computeTrainingLoad(
    activities7.map((a) => ({ ...a, type: a.type as ActivityType })),
    activities28.map((a) => ({ ...a, type: a.type as ActivityType })),
  )

  const grade = WELLNESS_GRADE(wellness.total)
  const shields = profile?.streakShields ?? 0
  const points = profile?.totalPoints ?? 0

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Wellness Score</h1>
        <p className="text-slate-400 text-sm mt-1">Your composite fitness and engagement health — updated daily.</p>
      </div>

      {/* Score ring */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <div className="relative">
            <ScoreRing score={wellness.total} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold text-white">{wellness.total}</span>
              <span className={`text-sm font-semibold ${grade.color}`}>{grade.label}</span>
            </div>
          </div>
          <p className="text-slate-400 text-sm text-center max-w-xs">
            Based on your last 28 days of activity, variety, improvement trend, and community engagement.
          </p>
        </CardContent>
      </Card>

      {/* Breakdown */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base">Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <BreakdownBar label="Consistency" value={wellness.consistency} max={30} color="bg-green-500" />
          <BreakdownBar label="Variety" value={wellness.variety} max={25} color="bg-blue-500" />
          <BreakdownBar label="Improvement" value={wellness.improvement} max={25} color="bg-purple-500" />
          <BreakdownBar label="Social" value={wellness.social} max={20} color="bg-yellow-500" />
        </CardContent>
      </Card>

      {/* Training Load */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-400" />
            Training Load
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <span className={`text-3xl font-bold ${load.color}`}>{load.status}</span>
            <div className="flex-1">
              <div className="h-3 w-full rounded-full bg-slate-700">
                <div
                  className={`h-full rounded-full ${STATUS_COLORS[load.status]} transition-all`}
                  style={{ width: `${Math.min(100, (load.recentMinutes / Math.max(1, load.baselineMinutes * 1.8)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-slate-700/40 p-3">
              <p className="text-slate-400 text-xs">This week</p>
              <p className="text-white font-semibold">{load.recentMinutes} min</p>
            </div>
            <div className="rounded-lg bg-slate-700/40 p-3">
              <p className="text-slate-400 text-xs">Weekly avg (4wk)</p>
              <p className="text-white font-semibold">{load.baselineMinutes} min</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {load.status === 'Fresh' && 'You\'re well rested. A quality session is a great idea.'}
            {load.status === 'Optimal' && 'Perfect training load — keep the momentum going!'}
            {load.status === 'Fatigued' && 'You\'ve been working hard. Consider an easy day or rest.'}
            {load.status === 'Overreached' && 'High load detected. Prioritize recovery to avoid injury.'}
          </p>
        </CardContent>
      </Card>

      {/* Streak Shield */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-yellow-400" />
            Streak Shields
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Shield
                    key={i}
                    className={`h-7 w-7 ${i < shields ? 'text-yellow-400 fill-yellow-400/20' : 'text-slate-600'}`}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {shields}/3 shields. Miss a day? A shield protects your streak automatically.
              </p>
            </div>
            {shields < 3 && points >= 50 ? (
              <form action={async () => { 'use server'; await buyStreakShield() }}>
                <button
                  type="submit"
                  className="rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold px-4 py-2 transition-colors"
                >
                  Buy Shield<br /><span className="text-xs font-normal opacity-80">50 pts</span>
                </button>
              </form>
            ) : shields >= 3 ? (
              <span className="text-xs text-slate-500">Max shields held</span>
            ) : (
              <span className="text-xs text-slate-500">Need 50 pts</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Carbon Savings */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Leaf className="h-4 w-4 text-green-400" />
            Carbon Savings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-green-400">
            {(profile?.carbonSavedKg ?? 0).toFixed(1)} kg
          </p>
          <p className="text-xs text-slate-400 mt-1">
            CO₂ saved vs driving since you joined — based on running, walking, and cycling activities.
          </p>
          <Link href="/app/leaderboards?tab=carbon" className="mt-3 inline-flex text-xs text-green-400 hover:underline">
            See community ranking →
          </Link>
        </CardContent>
      </Card>

      <Link href="/app/training" className="inline-flex text-sm text-slate-400 hover:text-white transition-colors">
        ← Back to Training Dashboard
      </Link>
    </div>
  )
}
