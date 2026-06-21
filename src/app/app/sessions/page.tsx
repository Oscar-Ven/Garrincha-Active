import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUpcomingSessions, getUserRegistrations, getOpenGames } from '@/services/sessions'
import { ActivityType, SkillLevel } from '@/generated/prisma'
import { activityTypeLabel } from '@/lib/utils'

export const metadata = { title: 'Sessions | Garrincha Active' }

const SKILL_LABEL: Record<SkillLevel, string> = {
  BEGINNER: 'Beginner',
  RECREATIONAL: 'Recreational',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  EXPERT: 'Expert',
}

const ACTIVITY_ICON: Record<string, string> = {
  RUN:               'directions_run',
  CYCLING:           'directions_bike',
  FOOTBALL_TRAINING: 'sports_soccer',
  FOOTBALL_MATCH:    'sports_soccer',
  FITNESS:           'fitness_center',
  WALK:              'directions_walk',
  SWIMMING:          'pool',
  TENNIS:            'sports_tennis',
  PADEL:             'sports_tennis',
  BASKETBALL:        'sports_basketball',
}

function activityIcon(type: string): string {
  return ACTIVITY_ICON[type] ?? 'sports'
}

export default async function SessionsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { centerId: true },
  })

  const [upcoming, myRegistrations, openGames] = await Promise.all([
    getUpcomingSessions(fullUser?.centerId ?? undefined),
    getUserRegistrations(user.id),
    getOpenGames(fullUser?.centerId ?? undefined),
  ])

  const mySessionIds = new Set(
    myRegistrations
      .filter((r) => r.status !== 'CANCELLED')
      .map((r) => r.sessionId),
  )

  return (
    <div className="mx-auto max-w-2xl space-y-lg">
      <div className="flex items-center justify-between gap-md">
        <div>
          <h1 className="text-headline-md font-black italic tracking-tight text-primary-fixed">Sessions</h1>
          <p className="text-label-caps text-on-surface-variant mt-xs">Book your spot at upcoming training sessions</p>
        </div>
        {fullUser?.centerId && (
          <Link
            href="/app/sessions/open/new"
            className="shrink-0 inline-flex items-center gap-xs bg-primary-fixed text-on-primary-fixed rounded-xl px-md py-sm text-label-caps font-bold hover:opacity-90 transition-opacity action-glow"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>add</span>
            Start a Game
          </Link>
        )}
      </div>

      {/* My upcoming registrations */}
      {myRegistrations.filter((r) => r.status === 'REGISTERED' && r.session.startTime > new Date()).length > 0 && (
        <section className="space-y-sm">
          <h2 className="text-label-caps text-on-surface-variant">Your bookings</h2>
          <div className="space-y-sm">
            {myRegistrations
              .filter((r) => r.status === 'REGISTERED' && r.session.startTime > new Date())
              .map((r) => (
                <Link
                  key={r.id}
                  href={`/app/sessions/${r.sessionId}`}
                  className="glass-card rounded-xl flex items-center gap-md p-md border-l-4 border-l-primary-fixed hover:bg-surface-container-high transition-colors active:scale-[0.99]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed/10">
                    <span
                      className="material-symbols-outlined text-primary-fixed"
                      style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
                    >
                      {activityIcon(r.session.type as string)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md font-bold text-on-surface truncate">{r.session.title}</p>
                    <p className="text-label-caps text-on-surface-variant">{r.session.center.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-label-caps font-bold text-primary-fixed">Registered</p>
                    <p className="text-label-caps text-on-surface-variant">
                      {r.session.startTime.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      )}

      {/* Open games */}
      {openGames.length > 0 && (
        <section className="space-y-sm">
          <h2 className="text-label-caps text-on-surface-variant">Open games ({openGames.length})</h2>
          <div className="space-y-sm">
            {openGames.map((session) => {
              const spotsTaken = session._count.participants
              const spotsLeft = session.capacity > 0 ? session.capacity - spotsTaken : null
              const isFull = spotsLeft !== null && spotsLeft <= 0
              return (
                <Link
                  key={session.id}
                  href={`/app/sessions/${session.id}`}
                  className="glass-card rounded-xl p-md border-l-4 border-l-[#FFD700] hover:bg-surface-container-high transition-colors active:scale-[0.99] block"
                >
                  <div className="flex items-start gap-md">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-container-highest">
                      <span
                        className="material-symbols-outlined text-[#FFD700]"
                        style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}
                      >
                        {activityIcon(session.type as string)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-sm flex-wrap mb-xs">
                        <p className="text-body-md font-bold text-on-surface">{session.title}</p>
                        <span className="rounded-full border border-[#FFD700]/30 bg-[#FFD700]/10 px-sm py-0.5 text-label-caps text-[#FFD700]">
                          Open Game
                        </span>
                        {isFull && (
                          <span className="rounded-full border border-error/30 bg-error/10 px-sm py-0.5 text-label-caps text-error">Full</span>
                        )}
                      </div>
                      <p className="text-label-caps text-on-surface-variant mb-xs">
                        by {session.createdBy.nickname ?? session.createdBy.name} · {session.center.name}
                      </p>
                      <div className="flex flex-wrap gap-x-md gap-y-xs text-label-caps text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>event</span>
                          {session.startTime.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {' '}
                          {session.startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>group</span>
                          {spotsTaken}{spotsLeft !== null ? `/${session.capacity}` : ''}
                        </span>
                        {(session.minSkillLevel || session.maxSkillLevel) && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>my_location</span>
                            {session.minSkillLevel ? SKILL_LABEL[session.minSkillLevel as SkillLevel] : 'Any'}
                            {session.maxSkillLevel && session.maxSkillLevel !== session.minSkillLevel
                              ? ` – ${SKILL_LABEL[session.maxSkillLevel as SkillLevel]}`
                              : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* All upcoming sessions */}
      <section className="space-y-sm">
        <h2 className="text-label-caps text-on-surface-variant">
          Upcoming sessions{upcoming.length > 0 && ` (${upcoming.length})`}
        </h2>

        {upcoming.length === 0 ? (
          <div className="glass-card rounded-xl p-md py-12 flex flex-col items-center text-center border border-dashed border-white/10">
            <span className="material-symbols-outlined text-on-surface-variant mb-sm" style={{ fontSize: '40px' }}>calendar_month</span>
            <p className="text-body-md font-bold text-on-surface">No upcoming sessions right now</p>
            <p className="text-label-caps text-on-surface-variant mt-xs">Check back later or ask your center to add one.</p>
          </div>
        ) : (
          <div className="space-y-sm">
            {upcoming.map((session) => {
              const isRegistered = mySessionIds.has(session.id)
              const spotsTaken = session._count.participants
              const spotsLeft = session.capacity > 0 ? session.capacity - spotsTaken : null
              const isFull = spotsLeft !== null && spotsLeft <= 0

              return (
                <Link
                  key={session.id}
                  href={`/app/sessions/${session.id}`}
                  className="glass-card rounded-xl p-md hover:bg-surface-container-high transition-colors active:scale-[0.99] block"
                >
                  <div className="flex items-start gap-md">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-container-highest">
                      <span
                        className="material-symbols-outlined text-secondary"
                        style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}
                      >
                        {activityIcon(session.type as string)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-sm flex-wrap mb-xs">
                        <p className="text-body-md font-bold text-on-surface">{session.title}</p>
                        {(session.isRecurring || session.parentSessionId) && (
                          <span className="rounded-full border border-secondary/30 bg-secondary/10 px-sm py-0.5 text-label-caps text-secondary flex items-center gap-1">
                            <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>repeat</span>
                            Recurring
                          </span>
                        )}
                        {isRegistered && (
                          <span className="rounded-full border border-primary-fixed/30 bg-primary-fixed/10 px-sm py-0.5 text-label-caps text-primary-fixed">
                            Registered
                          </span>
                        )}
                        {isFull && !isRegistered && (
                          <span className="rounded-full border border-error/30 bg-error/10 px-sm py-0.5 text-label-caps text-error">
                            Full
                          </span>
                        )}
                      </div>
                      <p className="text-label-caps text-on-surface-variant mb-xs">
                        {activityTypeLabel(session.type as ActivityType)} · {session.center.name}
                      </p>
                      <div className="flex flex-wrap gap-x-md gap-y-xs text-label-caps text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>event</span>
                          {session.startTime.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {' '}
                          {session.startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          {' – '}
                          {session.endTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>group</span>
                          {spotsTaken}{spotsLeft !== null ? `/${session.capacity}` : ''} attending
                        </span>
                        {session.pointsReward > 0 && (
                          <span className="flex items-center gap-1 text-[#FFD700]">
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: '12px', fontVariationSettings: "'FILL' 1" }}
                            >
                              stars
                            </span>
                            +{session.pointsReward} pts on attendance
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
