import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { DirectChallengeType } from '@/generated/prisma'
import { Swords, Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: '1v1 Challenge | Garrincha Active' }

const TYPE_LABELS: Record<DirectChallengeType, string> = {
  DISTANCE: 'Distance (km)',
  ACTIVITY_COUNT: 'Activities',
  ACTIVE_MINUTES: 'Active Minutes',
}

function getProgress(
  activities: { type: string; distanceKm: number | null; durationMinutes: number }[],
  challengeType: DirectChallengeType,
): number {
  switch (challengeType) {
    case 'DISTANCE':
      return activities.reduce((s, a) => s + (a.distanceKm ?? 0), 0)
    case 'ACTIVITY_COUNT':
      return activities.length
    case 'ACTIVE_MINUTES':
      return activities.reduce((s, a) => s + a.durationMinutes, 0)
    default:
      return 0
  }
}

export default async function DirectChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const challenge = await prisma.directChallenge.findUnique({
    where: { id },
    include: {
      challenger: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
      challengee: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
      winner: { select: { id: true, name: true } },
    },
  })

  if (!challenge) notFound()
  if (challenge.challengerId !== user.id && challenge.challengeeId !== user.id) notFound()

  // Get activities since challenge was created (for both players)
  const [challengerActivities, challengeeActivities] = await Promise.all([
    prisma.activity.findMany({
      where: { userId: challenge.challengerId, status: 'APPROVED', startedAt: { gte: challenge.createdAt } },
      select: { type: true, distanceKm: true, durationMinutes: true },
    }),
    challenge.status === 'ACTIVE' || challenge.status === 'COMPLETED'
      ? prisma.activity.findMany({
          where: { userId: challenge.challengeeId, status: 'APPROVED', startedAt: { gte: challenge.createdAt } },
          select: { type: true, distanceKm: true, durationMinutes: true },
        })
      : Promise.resolve([]),
  ])

  const challengerProgress = getProgress(challengerActivities, challenge.type)
  const challengeeProgress = getProgress(challengeeActivities, challenge.type)

  const pct = (v: number) => Math.min(100, (v / challenge.targetValue) * 100)

  const isChallenger = user.id === challenge.challengerId
  const opponent = isChallenger ? challenge.challengee : challenge.challenger
  const myProgress = isChallenger ? challengerProgress : challengeeProgress
  const theirProgress = isChallenger ? challengeeProgress : challengerProgress

  const unit = TYPE_LABELS[challenge.type]
  const now = new Date()
  const ended = now > new Date(challenge.endDate)

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <Swords className="h-6 w-6 text-orange-400" />
        <h1 className="text-xl font-bold text-white">1v1 Challenge</h1>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          challenge.status === 'ACTIVE' ? 'bg-green-900/40 text-green-300' :
          challenge.status === 'COMPLETED' ? 'bg-purple-900/40 text-purple-300' :
          challenge.status === 'PENDING' ? 'bg-yellow-900/40 text-yellow-300' :
          'bg-slate-700 text-slate-400'
        }`}>{challenge.status}</span>
      </div>

      {challenge.message && (
        <div className="rounded-lg border border-orange-800/30 bg-orange-950/20 px-4 py-3 text-sm text-orange-200 italic">
          &ldquo;{challenge.message}&rdquo;
        </div>
      )}

      {/* Winner banner */}
      {challenge.status === 'COMPLETED' && challenge.winner && (
        <div className="flex items-center gap-3 rounded-xl border border-yellow-700/40 bg-yellow-900/20 px-5 py-4">
          <Trophy className="h-6 w-6 text-yellow-400" />
          <p className="text-white font-semibold">
            {challenge.winner.id === user.id ? '🎉 You won!' : `${challenge.winner.name} won`}
          </p>
        </div>
      )}

      {/* Progress cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Me */}
        <Card className={`bg-slate-800 border-2 ${myProgress >= challenge.targetValue ? 'border-green-600' : 'border-slate-700'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white">You</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white tabular-nums">{myProgress.toFixed(1)}</p>
            <p className="text-xs text-slate-400">{unit}</p>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-700">
              <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct(myProgress)}%` }} />
            </div>
            <p className="text-xs text-slate-500 mt-1">{pct(myProgress).toFixed(0)}% of {challenge.targetValue}</p>
          </CardContent>
        </Card>

        {/* Opponent */}
        <Card className={`bg-slate-800 border-2 ${theirProgress >= challenge.targetValue ? 'border-orange-600' : 'border-slate-700'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white">{opponent.name.split(' ')[0]}</CardTitle>
          </CardHeader>
          <CardContent>
            {challenge.status === 'PENDING' ? (
              <p className="text-slate-500 text-sm">Awaiting acceptance</p>
            ) : (
              <>
                <p className="text-2xl font-bold text-white tabular-nums">{theirProgress.toFixed(1)}</p>
                <p className="text-xs text-slate-400">{unit}</p>
                <div className="mt-3 h-2 w-full rounded-full bg-slate-700">
                  <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${pct(theirProgress)}%` }} />
                </div>
                <p className="text-xs text-slate-500 mt-1">{pct(theirProgress).toFixed(0)}% of {challenge.targetValue}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Challenge type</span>
            <span className="text-white">{unit}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Target</span>
            <span className="text-white">{challenge.targetValue} {unit}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Ends</span>
            <span className={ended ? 'text-red-400' : 'text-white'}>
              {new Date(challenge.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              {ended ? ' (ended)' : ''}
            </span>
          </div>
        </CardContent>
      </Card>

      <Link href="/app/challenges/direct" className="text-sm text-slate-400 hover:text-white transition-colors">
        ← All 1v1 Challenges
      </Link>
    </div>
  )
}
