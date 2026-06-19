import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { getUpcomingSessions, getUserRegistrations } from '@/services/sessions'
import { ActivityType } from '@/generated/prisma'
import { activityTypeIcon, activityTypeLabel } from '@/lib/utils'

export const metadata = { title: 'Sessions | Garrincha Active' }

export default async function SessionsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const [upcoming, myRegistrations] = await Promise.all([
    getUpcomingSessions(),
    getUserRegistrations(user.id),
  ])

  const mySessionIds = new Set(
    myRegistrations
      .filter((r) => r.status !== 'CANCELLED')
      .map((r) => r.sessionId),
  )

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Sessions</h1>
          <p className="text-sm text-slate-400">Book your spot at upcoming training sessions</p>
        </div>
      </div>

      {/* My upcoming registrations */}
      {myRegistrations.filter((r) => r.status === 'REGISTERED' && r.session.startTime > new Date()).length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Your bookings</h2>
          <div className="space-y-2">
            {myRegistrations
              .filter((r) => r.status === 'REGISTERED' && r.session.startTime > new Date())
              .map((r) => (
                <Link
                  key={r.id}
                  href={`/app/sessions/${r.sessionId}`}
                  className="flex items-center gap-3 rounded-xl border border-green-600/30 bg-green-600/5 px-4 py-3 hover:bg-green-600/10 transition-colors"
                >
                  <span className="text-lg">{activityTypeIcon(r.session.type as ActivityType)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{r.session.title}</p>
                    <p className="text-xs text-slate-400">{r.session.center.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-green-400">Registered</p>
                    <p className="text-xs text-slate-500">
                      {r.session.startTime.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      )}

      {/* All upcoming sessions */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Upcoming sessions {upcoming.length > 0 && `(${upcoming.length})`}
        </h2>

        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-8 text-center">
            <p className="text-slate-400">No upcoming sessions right now.</p>
            <p className="mt-1 text-sm text-slate-500">Check back later or ask your center to add one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((session) => {
              const isRegistered = mySessionIds.has(session.id)
              const spotsTaken = session._count.participants
              const spotsLeft = session.capacity > 0 ? session.capacity - spotsTaken : null
              const isFull = spotsLeft !== null && spotsLeft <= 0

              return (
                <Link
                  key={session.id}
                  href={`/app/sessions/${session.id}`}
                  className="block rounded-2xl border border-slate-700 bg-slate-800 p-4 hover:border-slate-600 hover:bg-slate-700/60 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-700 text-2xl">
                      {activityTypeIcon(session.type as ActivityType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-white">{session.title}</p>
                        {(session.isRecurring || session.parentSessionId) && (
                          <span className="rounded-full border border-blue-600/40 bg-blue-600/10 px-2 py-0.5 text-xs font-medium text-blue-400">
                            🔁 Recurring
                          </span>
                        )}
                        {isRegistered && (
                          <span className="rounded-full border border-green-600/40 bg-green-600/10 px-2 py-0.5 text-xs font-medium text-green-400">
                            Registered
                          </span>
                        )}
                        {isFull && !isRegistered && (
                          <span className="rounded-full border border-red-600/40 bg-red-600/10 px-2 py-0.5 text-xs font-medium text-red-400">
                            Full
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-400">
                        {activityTypeLabel(session.type as ActivityType)} · {session.center.name}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>
                          📅 {session.startTime.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {' '}
                          {session.startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          {' – '}
                          {session.endTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>👥 {spotsTaken}{spotsLeft !== null ? `/${session.capacity}` : ''} attending</span>
                        {session.pointsReward > 0 && (
                          <span className="text-yellow-500">⭐ +{session.pointsReward} pts on attendance</span>
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
