import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { ChallengeType } from '@/generated/prisma'
import { formatDate } from '@/lib/utils'
import { Trophy, Plus, Users, Calendar, Zap, ToggleLeft, ToggleRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CreateChallengeDialog from './create-challenge-dialog'

export const metadata = { title: 'Challenges — Admin' }

const CHALLENGE_TYPE_LABELS: Record<ChallengeType, string> = {
  DISTANCE: 'Distance',
  ACTIVE_MINUTES: 'Active Minutes',
  ACTIVITY_COUNT: 'Activity Count',
  FOOTBALL_TRAINING_ATTENDANCE: 'Football Training Attendance',
  MATCH_COUNT: 'Match Count',
  POINTS: 'Points',
  CENTER_VS_CENTER: 'Center vs Center',
  TEAM: 'Team',
  STREAK: 'Streak',
  SEGMENT_EFFORTS: 'Segment Efforts',
}

const CHALLENGE_TYPE_UNITS: Record<ChallengeType, string> = {
  DISTANCE: 'km',
  ACTIVE_MINUTES: 'min',
  ACTIVITY_COUNT: 'activities',
  FOOTBALL_TRAINING_ATTENDANCE: 'sessions',
  MATCH_COUNT: 'matches',
  POINTS: 'pts',
  CENTER_VS_CENTER: 'pts',
  TEAM: 'pts',
  STREAK: 'days',
  SEGMENT_EFFORTS: 'segments',
}

async function toggleChallengeActive(id: string, current: boolean) {
  'use server'
  const session = await getCurrentUser()
  if (!session || (session.role !== 'PLATFORM_ADMIN' && session.role !== 'CENTER_ADMIN')) {
    redirect('/login')
  }
  await prisma.challenge.update({
    where: { id },
    data: { isActive: !current },
  })
  revalidatePath('/admin/challenges')
}

export default async function ChallengesPage() {
  const session = await getCurrentUser()
  if (!session) redirect('/login')
  if (session.role !== 'PLATFORM_ADMIN' && session.role !== 'CENTER_ADMIN') redirect('/app')

  const challenges = await prisma.challenge.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { participants: true } },
      center: { select: { name: true } },
      badge: { select: { name: true } },
    },
  })

  const now = new Date()

  const activeChallenges = challenges.filter((c) => c.isActive && c.endDate > now).length
  const totalParticipants = challenges.reduce((sum, c) => sum + c._count.participants, 0)
  const expiredChallenges = challenges.filter((c) => c.endDate <= now).length

  function getChallengeStatus(challenge: (typeof challenges)[number]) {
    if (!challenge.isActive) return { label: 'Inactive', className: 'bg-slate-700 text-slate-400' }
    if (challenge.startDate > now) return { label: 'Upcoming', className: 'bg-blue-900/40 text-blue-300' }
    if (challenge.endDate <= now) return { label: 'Ended', className: 'bg-slate-700 text-slate-400' }
    return { label: 'Active', className: 'bg-green-900/40 text-green-400' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Challenges</h1>
          <p className="text-slate-400 text-sm mt-1">Create and manage platform challenges for players.</p>
        </div>
        <CreateChallengeDialog />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-yellow-900/40 p-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{challenges.length}</p>
              <p className="text-xs text-slate-400">Total Challenges</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-green-900/40 p-2">
              <Zap className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{activeChallenges}</p>
              <p className="text-xs text-slate-400">Currently Active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-900/40 p-2">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalParticipants}</p>
              <p className="text-xs text-slate-400">Total Participants</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-slate-700 p-2">
              <Calendar className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{expiredChallenges}</p>
              <p className="text-xs text-slate-400">Ended</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-0">
          <CardTitle className="text-white text-base">All Challenges</CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          {challenges.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
              <Trophy className="h-10 w-10 opacity-40" />
              <p className="text-sm">No challenges yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400 px-4 py-3">
                      Challenge
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400 px-4 py-3 hidden md:table-cell">
                      Type
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400 px-4 py-3 hidden lg:table-cell">
                      Dates
                    </th>
                    <th className="text-right text-xs font-semibold uppercase tracking-wide text-slate-400 px-4 py-3 hidden sm:table-cell">
                      Target
                    </th>
                    <th className="text-right text-xs font-semibold uppercase tracking-wide text-slate-400 px-4 py-3">
                      Reward
                    </th>
                    <th className="text-right text-xs font-semibold uppercase tracking-wide text-slate-400 px-4 py-3 hidden sm:table-cell">
                      Players
                    </th>
                    <th className="text-center text-xs font-semibold uppercase tracking-wide text-slate-400 px-4 py-3">
                      Status
                    </th>
                    <th className="text-center text-xs font-semibold uppercase tracking-wide text-slate-400 px-4 py-3">
                      Toggle
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {challenges.map((challenge) => {
                    const status = getChallengeStatus(challenge)
                    const unit = CHALLENGE_TYPE_UNITS[challenge.type]
                    return (
                      <tr key={challenge.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-white line-clamp-1">{challenge.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 hidden sm:block">
                              {challenge.description}
                            </p>
                            {challenge.center && (
                              <p className="text-xs text-blue-400 mt-0.5">{challenge.center.name}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="inline-flex items-center rounded-md bg-slate-700/60 px-2 py-1 text-xs font-medium text-slate-300">
                            {CHALLENGE_TYPE_LABELS[challenge.type]}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <p className="text-slate-300 text-xs">
                            {formatDate(challenge.startDate)}
                          </p>
                          <p className="text-slate-500 text-xs">
                            to {formatDate(challenge.endDate)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell">
                          <span className="text-white font-semibold">
                            {challenge.targetValue % 1 === 0
                              ? challenge.targetValue.toFixed(0)
                              : challenge.targetValue.toFixed(1)}
                          </span>
                          <span className="text-slate-500 text-xs ml-1">{unit}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-yellow-400 font-semibold">{challenge.pointsReward}</span>
                          <span className="text-slate-500 text-xs ml-1">pts</span>
                          {challenge.badge && (
                            <p className="text-xs text-purple-400 mt-0.5">{challenge.badge.name}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell">
                          <div className="flex items-center justify-end gap-1">
                            <Users className="h-3.5 w-3.5 text-slate-500" />
                            <span className="text-white">{challenge._count.participants}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <form action={toggleChallengeActive.bind(null, challenge.id, challenge.isActive)}>
                            <button
                              type="submit"
                              title={challenge.isActive ? 'Deactivate challenge' : 'Activate challenge'}
                              className="inline-flex items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 focus:ring-offset-slate-800"
                            >
                              {challenge.isActive ? (
                                <ToggleRight className="h-5 w-5 text-green-400" />
                              ) : (
                                <ToggleLeft className="h-5 w-5 text-slate-500" />
                              )}
                            </button>
                          </form>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
