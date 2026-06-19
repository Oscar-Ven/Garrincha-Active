import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { DirectChallengeStatus, DirectChallengeType } from '@/generated/prisma'
import { formatDistanceToNow, isPast } from 'date-fns'
import { Swords, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { revalidatePath } from 'next/cache'

export const metadata = { title: '1v1 Challenges | Garrincha Active' }

const TYPE_LABELS: Record<DirectChallengeType, string> = {
  DISTANCE: 'Distance (km)',
  ACTIVITY_COUNT: 'Activity Count',
  ACTIVE_MINUTES: 'Active Minutes',
}

const STATUS_STYLES: Record<DirectChallengeStatus, string> = {
  PENDING: 'bg-yellow-900/40 text-yellow-300',
  ACCEPTED: 'bg-blue-900/40 text-blue-300',
  DECLINED: 'bg-slate-700 text-slate-400',
  ACTIVE: 'bg-green-900/40 text-green-300',
  COMPLETED: 'bg-purple-900/40 text-purple-300',
  CANCELLED: 'bg-slate-700 text-slate-400',
}

async function acceptChallenge(challengeId: string) {
  'use server'
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  await prisma.directChallenge.update({
    where: { id: challengeId, challengeeId: user.id, status: 'PENDING' },
    data: { status: 'ACTIVE' },
  })
  await prisma.notification.create({
    data: {
      userId: (await prisma.directChallenge.findUnique({ where: { id: challengeId }, select: { challengerId: true } }))!.challengerId,
      type: 'DIRECT_CHALLENGE_ACCEPTED',
      title: 'Challenge accepted!',
      body: `${user.name} accepted your 1v1 challenge`,
      linkUrl: `/app/challenges/direct/${challengeId}`,
    },
  })
  revalidatePath('/app/challenges/direct')
}

async function declineChallenge(challengeId: string) {
  'use server'
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  await prisma.directChallenge.update({
    where: { id: challengeId, challengeeId: user.id, status: 'PENDING' },
    data: { status: 'DECLINED' },
  })
  revalidatePath('/app/challenges/direct')
}

export default async function DirectChallengePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const [sent, received] = await Promise.all([
    prisma.directChallenge.findMany({
      where: { challengerId: user.id },
      include: {
        challengee: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.directChallenge.findMany({
      where: { challengeeId: user.id },
      include: {
        challenger: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  const pendingCount = received.filter((c) => c.status === 'PENDING').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Swords className="h-6 w-6 text-orange-400" /> 1v1 Challenges
          </h1>
          <p className="text-slate-400 text-sm mt-1">Challenge friends to head-to-head competitions.</p>
        </div>
        <Link
          href="/app/challenges/direct/new"
          className="flex items-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          <Plus className="h-4 w-4" /> New Challenge
        </Link>
      </div>

      {/* Pending incoming */}
      {pendingCount > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-yellow-400">
            Pending ({pendingCount})
          </h2>
          {received.filter((c) => c.status === 'PENDING').map((c) => (
            <Card key={c.id} className="bg-yellow-950/20 border-yellow-800/40">
              <CardContent className="p-4 flex items-center gap-4">
                <Swords className="h-5 w-5 text-yellow-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">
                    <span className="text-yellow-300">{c.challenger.name}</span> challenged you!
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {TYPE_LABELS[c.type]} · Target: {c.targetValue} · Ends {formatDistanceToNow(new Date(c.endDate), { addSuffix: true })}
                  </p>
                  {c.message && <p className="text-xs text-slate-300 mt-1 italic">"{c.message}"</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <form action={acceptChallenge.bind(null, c.id)}>
                    <button type="submit" className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 transition-colors">
                      Accept
                    </button>
                  </form>
                  <form action={declineChallenge.bind(null, c.id)}>
                    <button type="submit" className="rounded-lg border border-slate-600 text-slate-400 hover:text-white text-xs font-semibold px-3 py-1.5 transition-colors">
                      Decline
                    </button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Active & all */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Sent */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Challenges Sent</h2>
          {sent.length === 0 ? (
            <p className="text-slate-500 text-sm">No challenges sent yet.</p>
          ) : (
            sent.map((c) => (
              <Link key={c.id} href={`/app/challenges/direct/${c.id}`}>
                <Card className="bg-slate-800 border-slate-700 hover:border-slate-500 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-white text-sm font-medium">vs {c.challengee.name}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[c.status]}`}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{TYPE_LABELS[c.type]} · {c.targetValue}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Ends {formatDistanceToNow(new Date(c.endDate), { addSuffix: true })}</p>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>

        {/* Received */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Challenges Received</h2>
          {received.length === 0 ? (
            <p className="text-slate-500 text-sm">No challenges received yet.</p>
          ) : (
            received.filter((c) => c.status !== 'PENDING').map((c) => (
              <Link key={c.id} href={`/app/challenges/direct/${c.id}`}>
                <Card className="bg-slate-800 border-slate-700 hover:border-slate-500 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-white text-sm font-medium">from {c.challenger.name}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[c.status]}`}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{TYPE_LABELS[c.type]} · {c.targetValue}</p>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
