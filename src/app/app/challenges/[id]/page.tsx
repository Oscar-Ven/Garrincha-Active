import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'

const challengeTypeLabels: Record<string, string> = {
  DISTANCE: 'Distance (km)',
  ACTIVE_MINUTES: 'Active Minutes',
  ACTIVITY_COUNT: 'Activities',
  FOOTBALL_TRAINING_ATTENDANCE: 'Football Trainings',
  MATCH_COUNT: 'Matches',
  POINTS: 'Points',
  CENTER_VS_CENTER: 'Center vs Center',
  TEAM: 'Team',
}

export default async function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getCurrentUser()
  if (!session) redirect('/login')

  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: {
      badge: true,
      center: { select: { name: true } },
      sponsor: { select: { name: true } },
      _count: { select: { participants: true } },
    },
  })

  if (!challenge) notFound()

  const participation = await prisma.challengeParticipant.findUnique({
    where: { challengeId_userId: { challengeId: id, userId: session.id } },
  })

  const leaderboard = await prisma.challengeParticipant.findMany({
    where: { challengeId: id },
    orderBy: { progress: 'desc' },
    take: 10,
    include: { user: { select: { name: true, nickname: true } } },
  })

  async function joinChallenge() {
    'use server'
    const user = await getCurrentUser()
    if (!user) return
    const now = new Date()
    if (now > challenge!.endDate) return
    await prisma.challengeParticipant.upsert({
      where: { challengeId_userId: { challengeId: id, userId: user.id } },
      update: {},
      create: { challengeId: id, userId: user.id, progress: 0 },
    })
    redirect('/app/challenges')
  }

  const progressPct = participation
    ? Math.min(100, (participation.progress / challenge.targetValue) * 100)
    : 0

  const now = new Date()
  const isExpired = now > challenge.endDate
  const isActive = challenge.isActive && !isExpired

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <span className="text-xs rounded-full bg-blue-900/40 text-blue-300 px-2 py-0.5 font-medium">
          {challengeTypeLabels[challenge.type] ?? challenge.type}
        </span>
        <h1 className="text-2xl font-bold text-white mt-2">{challenge.title}</h1>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6 space-y-4">
          <p className="text-slate-300">{challenge.description}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-700 p-3">
              <p className="text-xs text-slate-400">Target</p>
              <p className="text-lg font-bold text-white">
                {challenge.targetValue} {challengeTypeLabels[challenge.type] ?? ''}
              </p>
            </div>
            <div className="rounded-lg bg-slate-700 p-3">
              <p className="text-xs text-slate-400">Reward</p>
              <p className="text-lg font-bold text-yellow-400">{challenge.pointsReward} pts</p>
            </div>
            <div className="rounded-lg bg-slate-700 p-3">
              <p className="text-xs text-slate-400">Ends</p>
              <p className="text-sm font-semibold text-white">{formatDate(challenge.endDate)}</p>
            </div>
            <div className="rounded-lg bg-slate-700 p-3">
              <p className="text-xs text-slate-400">Participants</p>
              <p className="text-sm font-semibold text-white">{challenge._count.participants}</p>
            </div>
          </div>

          {challenge.badge && (
            <div className="flex items-center gap-2 rounded-lg bg-yellow-900/30 border border-yellow-700/40 px-3 py-2">
              <span className="text-lg">🏅</span>
              <div>
                <p className="text-xs text-yellow-400 font-medium">Badge reward</p>
                <p className="text-sm text-white">{challenge.badge.name}</p>
              </div>
            </div>
          )}

          {participation ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Your progress</span>
                <span className="text-white font-medium">
                  {participation.progress.toFixed(1)} / {challenge.targetValue}
                </span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progressPct.toFixed(0)}%`,
                    background: participation.isCompleted ? '#22c55e' : '#3b82f6',
                  }}
                />
              </div>
              {participation.isCompleted ? (
                <p className="text-green-400 text-sm font-medium">✓ Challenge completed!</p>
              ) : (
                <p className="text-slate-400 text-xs">
                  Progress updates automatically when you log activities
                </p>
              )}
            </div>
          ) : isActive ? (
            <form action={joinChallenge}>
              <button
                type="submit"
                className="w-full rounded-lg bg-green-600 text-white py-2.5 font-semibold hover:bg-green-500 transition-colors"
              >
                Join Challenge
              </button>
            </form>
          ) : (
            <p className="text-slate-400 text-sm text-center py-2">
              {isExpired ? 'This challenge has ended.' : 'This challenge is not active.'}
            </p>
          )}
        </CardContent>
      </Card>

      {leaderboard.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">Challenge Leaderboard</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-700">
              {leaderboard.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span className="text-sm font-bold w-6 text-center text-slate-400">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{p.user.name}</p>
                    <p className="text-xs text-slate-400">@{p.user.nickname}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{p.progress.toFixed(1)}</p>
                    {p.isCompleted && <p className="text-xs text-green-400">✓ Done</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
