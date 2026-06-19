import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { getSession, markAttended } from '@/services/sessions'
import { ActivityType } from '@/generated/prisma'
import { activityTypeIcon, activityTypeLabel } from '@/lib/utils'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession(id)
  return { title: session ? `${session.title} | Admin Sessions` : 'Session' }
}

export default async function AdminSessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || user.role !== 'PLATFORM_ADMIN') redirect('/app')

  const session = await getSession(id)
  if (!session) notFound()

  const spotsTaken = session._count.participants
  const spotsLeft = session.capacity > 0 ? session.capacity - spotsTaken : null
  const isPast = session.startTime < new Date()

  async function handleMarkAttended(formData: FormData) {
    'use server'
    const u = await getCurrentUser()
    if (!u || u.role !== 'PLATFORM_ADMIN') redirect('/app')
    const userId = formData.get('userId') as string
    if (!userId) return
    await markAttended(id, userId)
    revalidatePath(`/admin/sessions/${id}`)
  }

  const formatDt = (d: Date) =>
    `${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/sessions" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">{session.title}</h1>
          <p className="text-xs text-slate-400">{session.center.name} · {activityTypeLabel(session.type as ActivityType)}</p>
        </div>
      </div>

      {/* Session info */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-400">Start</p>
            <p className="mt-0.5 text-sm font-semibold text-white">{formatDt(session.startTime)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">End</p>
            <p className="mt-0.5 text-sm font-semibold text-white">{formatDt(session.endTime)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Capacity</p>
            <p className="mt-0.5 text-sm font-semibold text-white">
              {spotsTaken}{spotsLeft !== null ? `/${session.capacity}` : ''} registered
              {spotsLeft !== null && <span className={`ml-1 text-xs ${spotsLeft <= 0 ? 'text-red-400' : 'text-green-400'}`}>({spotsLeft <= 0 ? 'Full' : `${spotsLeft} left`})</span>}
            </p>
          </div>
          {session.pointsReward > 0 && (
            <div>
              <p className="text-xs text-slate-400">Points reward</p>
              <p className="mt-0.5 text-sm font-semibold text-yellow-400">+{session.pointsReward} pts</p>
            </div>
          )}
          <div>
            <p className="text-xs text-slate-400">Status</p>
            <p className={`mt-0.5 text-sm font-semibold ${isPast ? 'text-slate-400' : 'text-green-400'}`}>
              {isPast ? 'Ended' : 'Upcoming'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Visibility</p>
            <p className="mt-0.5 text-sm font-semibold text-white">{session.isPublic ? 'Public' : 'Admin-only'}</p>
          </div>
        </div>
        {session.description && (
          <p className="mt-4 text-sm text-slate-300 border-t border-slate-700 pt-4">{session.description}</p>
        )}
      </div>

      {/* Participants */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Participants ({session.participants.length})
        </h2>

        {session.participants.length === 0 ? (
          <p className="text-sm text-slate-500">No one registered yet.</p>
        ) : (
          <div className="space-y-2">
            {session.participants.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-white">
                  {p.user.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{p.user.name}</p>
                  <p className="text-xs text-slate-500">@{p.user.nickname}</p>
                </div>
                <div className="shrink-0 flex items-center gap-3">
                  <span className={`text-xs font-medium ${p.status === 'ATTENDED' ? 'text-green-400' : 'text-slate-400'}`}>
                    {p.status === 'ATTENDED' ? '✅ Attended' : 'Registered'}
                  </span>
                  {isPast && p.status === 'REGISTERED' && (
                    <form action={handleMarkAttended}>
                      <input type="hidden" name="userId" value={p.userId} />
                      <button type="submit"
                        className="rounded-lg bg-green-600/20 border border-green-600/40 px-2.5 py-1 text-xs font-medium text-green-400 hover:bg-green-600/30 transition-colors">
                        Mark attended
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
