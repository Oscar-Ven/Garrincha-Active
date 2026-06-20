import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { getSession, registerForSession, cancelRegistration } from '@/services/sessions'
import { ActivityType } from '@/generated/prisma'
import { activityTypeIcon, activityTypeLabel } from '@/lib/utils'
import { PayButton } from '@/components/ui/pay-button'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession(id)
  return { title: session ? `${session.title} | Sessions` : 'Session' }
}

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const session = await getSession(id)
  if (!session) notFound()

  const myParticipation = session.participants.find((p) => p.userId === user.id)
  const isRegistered = myParticipation?.status === 'REGISTERED'
  const isWaitlisted = myParticipation?.status === 'WAITLISTED'
  const isAttended = myParticipation?.status === 'ATTENDED'

  // Confirmed count = REGISTERED + ATTENDED (from _count query in getSession)
  const confirmedCount = session._count.participants

  // Waitlisted count for display
  const waitlistedCount = session.participants.filter((p) => p.status === 'WAITLISTED').length

  const spotsLeft = session.capacity > 0 ? session.capacity - confirmedCount : null
  const isFull = spotsLeft !== null && spotsLeft <= 0
  const isPast = session.startTime < new Date()

  // Compute waitlist position
  let waitlistPosition: number | null = null
  if (isWaitlisted) {
    const waitlistedParticipants = session.participants
      .filter((p) => p.status === 'WAITLISTED')
      .sort((a, b) => new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime())
    waitlistPosition = waitlistedParticipants.findIndex((p) => p.userId === user.id) + 1
  }

  async function handleRegister() {
    'use server'
    const u = await getCurrentUser()
    if (!u) redirect('/login')
    await registerForSession(id, u.id)
    revalidatePath(`/app/sessions/${id}`)
  }

  async function handleCancel() {
    'use server'
    const u = await getCurrentUser()
    if (!u) redirect('/login')
    await cancelRegistration(id, u.id)
    revalidatePath(`/app/sessions/${id}`)
  }

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const formatDay = (d: Date) =>
    d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/app/sessions" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        Back to Sessions
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-700 text-4xl">
            {activityTypeIcon(session.type as ActivityType)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white">{session.title}</h1>
            <p className="text-sm text-slate-400">
              {activityTypeLabel(session.type as ActivityType)} · {session.center.name}
            </p>
            {isRegistered && (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-green-600/40 bg-green-600/10 px-2.5 py-0.5 text-xs font-semibold text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Registered
              </span>
            )}
            {isWaitlisted && (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-yellow-600/40 bg-yellow-600/10 px-2.5 py-0.5 text-xs font-semibold text-yellow-400">
                ⏳ Waitlisted
                {waitlistPosition !== null && ` · #${waitlistPosition}`}
              </span>
            )}
            {isAttended && (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-yellow-600/40 bg-yellow-600/10 px-2.5 py-0.5 text-xs font-semibold text-yellow-400">
                ✅ Attended
              </span>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-slate-700/40 px-4 py-3">
            <p className="text-xs text-slate-400">Date</p>
            <p className="mt-0.5 text-sm font-semibold text-white">{formatDay(session.startTime)}</p>
          </div>
          <div className="rounded-xl bg-slate-700/40 px-4 py-3">
            <p className="text-xs text-slate-400">Time</p>
            <p className="mt-0.5 text-sm font-semibold text-white">{formatTime(session.startTime)} – {formatTime(session.endTime)}</p>
          </div>
          <div className="rounded-xl bg-slate-700/40 px-4 py-3">
            <p className="text-xs text-slate-400">Spots</p>
            <p className="mt-0.5 text-sm font-semibold text-white">
              {session.capacity > 0 ? (
                <>
                  {confirmedCount}/{session.capacity} spots
                  {waitlistedCount > 0 && (
                    <span className="ml-1.5 text-yellow-400">· {waitlistedCount} waitlisted</span>
                  )}
                  {!isFull && spotsLeft !== null && spotsLeft > 0 && (
                    <span className="ml-1 text-green-400">({spotsLeft} left)</span>
                  )}
                  {isFull && waitlistedCount === 0 && (
                    <span className="ml-1 text-red-400">(Full)</span>
                  )}
                </>
              ) : (
                <>{confirmedCount} attending</>
              )}
            </p>
          </div>
          {session.pointsReward > 0 && (
            <div className="rounded-xl bg-yellow-600/10 border border-yellow-600/20 px-4 py-3">
              <p className="text-xs text-slate-400">Points reward</p>
              <p className="mt-0.5 text-sm font-semibold text-yellow-400">+{session.pointsReward} pts</p>
            </div>
          )}
        </div>

        {session.description && (
          <p className="mt-4 text-sm text-slate-300 leading-relaxed">{session.description}</p>
        )}

        {/* Action */}
        {!isPast && (
          <div className="mt-5 border-t border-slate-700 pt-5">
            {isRegistered || isWaitlisted ? (
              <div className="space-y-3">
                {isWaitlisted && waitlistPosition !== null && (
                  <p className="text-sm text-yellow-400">
                    You&apos;re #{waitlistPosition} on the waitlist. We&apos;ll notify you if a spot opens.
                  </p>
                )}
                <form action={handleCancel}>
                  <button
                    type="submit"
                    className="rounded-xl border border-slate-600 px-6 py-2.5 text-sm font-medium text-slate-300 hover:border-red-600/40 hover:text-red-400 transition-colors"
                  >
                    {isWaitlisted ? 'Leave waitlist' : 'Cancel registration'}
                  </button>
                </form>
              </div>
            ) : !isAttended ? (
              <div className="flex items-center gap-3">
                <form action={handleRegister}>
                  <button
                    type="submit"
                    className={`rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-colors ${
                      isFull
                        ? 'bg-yellow-600 hover:bg-yellow-500'
                        : 'bg-green-600 hover:bg-green-500'
                    }`}
                  >
                    {isFull ? 'Join Waitlist' : 'Register'}
                  </button>
                </form>
                {session.price != null && Number(session.price) > 0 && (
                  <PayButton
                    sessionId={session.id}
                    price={Math.round(Number(session.price) * 100)}
                    description={session.title}
                  />
                )}
              </div>
            ) : null}
          </div>
        )}
        {isPast && !isAttended && (
          <p className="mt-4 text-sm text-slate-500">This session has ended.</p>
        )}
      </div>

      {/* Participants list */}
      {session.participants.filter((p) => p.status !== 'WAITLISTED').length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Attendees ({session.participants.filter((p) => p.status !== 'WAITLISTED').length})
          </h2>
          <div className="space-y-2">
            {session.participants
              .filter((p) => p.status !== 'WAITLISTED')
              .map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-white">
                    {p.user.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/app/players/${p.user.id}`} className="text-sm font-medium text-white hover:text-green-400 transition-colors">
                      {p.user.name}
                    </Link>
                    <p className="text-xs text-slate-500">@{p.user.nickname}</p>
                  </div>
                  <span className={`text-xs font-medium ${p.status === 'ATTENDED' ? 'text-green-400' : 'text-slate-400'}`}>
                    {p.status === 'ATTENDED' ? '✅ Attended' : 'Registered'}
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Waitlist section */}
      {waitlistedCount > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Waitlist ({waitlistedCount})
          </h2>
          <div className="space-y-2">
            {session.participants
              .filter((p) => p.status === 'WAITLISTED')
              .sort((a, b) => new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime())
              .map((p, idx) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl border border-yellow-700/30 bg-yellow-900/10 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-white">
                    {p.user.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/app/players/${p.user.id}`} className="text-sm font-medium text-white hover:text-green-400 transition-colors">
                      {p.user.name}
                    </Link>
                    <p className="text-xs text-slate-500">@{p.user.nickname}</p>
                  </div>
                  <span className="text-xs font-medium text-yellow-400">#{idx + 1}</span>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  )
}
