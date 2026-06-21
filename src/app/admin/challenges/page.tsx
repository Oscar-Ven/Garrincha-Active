import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { ChallengeType } from '@/generated/prisma'
import { formatDate } from '@/lib/utils'
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
  await prisma.challenge.update({ where: { id }, data: { isActive: !current } })
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
    if (!challenge.isActive) return { label: 'Inactive', className: 'bg-surface-container text-on-surface-variant' }
    if (challenge.startDate > now) return { label: 'Upcoming', className: 'bg-secondary/10 text-secondary' }
    if (challenge.endDate <= now) return { label: 'Ended', className: 'bg-surface-container text-on-surface-variant' }
    return { label: 'Active', className: 'bg-primary-fixed/10 text-primary-fixed' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Challenges</h1>
          <p className="text-on-surface-variant text-sm mt-1">Create and manage platform challenges for players.</p>
        </div>
        <CreateChallengeDialog />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="rounded-lg bg-[#FFD700]/10 p-2">
            <span className="material-symbols-outlined text-[#FFD700]" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-on-surface">{challenges.length}</p>
            <p className="text-xs text-on-surface-variant">Total Challenges</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="rounded-lg bg-primary-fixed/10 p-2">
            <span className="material-symbols-outlined text-primary-fixed" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>bolt</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-on-surface">{activeChallenges}</p>
            <p className="text-xs text-on-surface-variant">Currently Active</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="rounded-lg bg-secondary/10 p-2">
            <span className="material-symbols-outlined text-secondary" style={{ fontSize: '20px' }}>group</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-on-surface">{totalParticipants}</p>
            <p className="text-xs text-on-surface-variant">Total Participants</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="rounded-lg bg-surface-container-highest p-2">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>event</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-on-surface">{expiredChallenges}</p>
            <p className="text-xs text-on-surface-variant">Ended</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-on-surface">All Challenges</h2>
        </div>
        <div className="p-0">
          {challenges.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-on-surface-variant">
              <span className="material-symbols-outlined opacity-40" style={{ fontSize: '40px' }}>emoji_events</span>
              <p className="text-sm">No challenges yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant px-4 py-3">Challenge</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant px-4 py-3 hidden md:table-cell">Type</th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant px-4 py-3 hidden lg:table-cell">Dates</th>
                    <th className="text-right text-xs font-semibold uppercase tracking-wide text-on-surface-variant px-4 py-3 hidden sm:table-cell">Target</th>
                    <th className="text-right text-xs font-semibold uppercase tracking-wide text-on-surface-variant px-4 py-3">Reward</th>
                    <th className="text-right text-xs font-semibold uppercase tracking-wide text-on-surface-variant px-4 py-3 hidden sm:table-cell">Players</th>
                    <th className="text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant px-4 py-3">Status</th>
                    <th className="text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant px-4 py-3">Toggle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {challenges.map((challenge) => {
                    const status = getChallengeStatus(challenge)
                    const unit = CHALLENGE_TYPE_UNITS[challenge.type]
                    return (
                      <tr key={challenge.id} className="hover:bg-surface-container-high transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-on-surface line-clamp-1">{challenge.title}</p>
                            <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-1 hidden sm:block">{challenge.description}</p>
                            {challenge.center && (
                              <p className="text-xs text-secondary mt-0.5">{challenge.center.name}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="inline-flex items-center rounded-md bg-surface-container-highest px-2 py-1 text-xs font-medium text-on-surface">
                            {CHALLENGE_TYPE_LABELS[challenge.type]}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <p className="text-on-surface text-xs">{formatDate(challenge.startDate)}</p>
                          <p className="text-on-surface-variant text-xs">to {formatDate(challenge.endDate)}</p>
                        </td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell">
                          <span className="text-on-surface font-semibold">
                            {challenge.targetValue % 1 === 0 ? challenge.targetValue.toFixed(0) : challenge.targetValue.toFixed(1)}
                          </span>
                          <span className="text-on-surface-variant text-xs ml-1">{unit}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-[#FFD700] font-semibold">{challenge.pointsReward}</span>
                          <span className="text-on-surface-variant text-xs ml-1">pts</span>
                          {challenge.badge && (
                            <p className="text-xs text-purple-400 mt-0.5">{challenge.badge.name}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell">
                          <div className="flex items-center justify-end gap-1">
                            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '14px' }}>group</span>
                            <span className="text-on-surface">{challenge._count.participants}</span>
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
                              className="inline-flex items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary-fixed focus:ring-offset-2 focus:ring-offset-surface-container-lowest"
                            >
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
                              >
                                {challenge.isActive ? 'toggle_on' : 'toggle_off'}
                              </span>
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
        </div>
      </div>
    </div>
  )
}
