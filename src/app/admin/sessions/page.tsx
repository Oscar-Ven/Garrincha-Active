import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ActivityType } from '@/generated/prisma'
import { activityTypeIcon, activityTypeLabel } from '@/lib/utils'

export const metadata = { title: 'Sessions | Admin' }

export default async function AdminSessionsPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'PLATFORM_ADMIN') redirect('/app')

  const sessions = await prisma.centerSession.findMany({
    include: {
      center: { select: { name: true } },
      _count: { select: { participants: { where: { status: { not: 'CANCELLED' } } } } },
    },
    orderBy: { startTime: 'desc' },
    take: 50,
  })

  const centers = await prisma.center.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  const now = new Date()
  const upcoming = sessions.filter((s) => s.startTime >= now)
  const past = sessions.filter((s) => s.startTime < now)

  const sessionRow = (s: (typeof sessions)[number]) => {
    const spotsTaken = s._count.participants
    const spotsLeft = s.capacity > 0 ? s.capacity - spotsTaken : null
    return (
      <Link
        key={s.id}
        href={`/admin/sessions/${s.id}`}
        className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 hover:bg-slate-700 transition-colors"
      >
        <span className="text-lg">{activityTypeIcon(s.type as ActivityType)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white truncate">{s.title}</p>
            {(s.isRecurring || s.parentSessionId) && (
              <span className="shrink-0 rounded-full border border-blue-600/40 bg-blue-600/10 px-2 py-0.5 text-xs font-medium text-blue-400">
                🔁 Recurring
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            {s.center.name} · {activityTypeLabel(s.type as ActivityType)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-slate-300">
            {s.startTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}{' '}
            {s.startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-xs text-slate-500">
            {spotsTaken}{spotsLeft !== null ? `/${s.capacity}` : ''} registered
          </p>
        </div>
      </Link>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Sessions</h1>
        <Link
          href="/admin/sessions/new"
          className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
        >
          + New session
        </Link>
      </div>

      {sessions.length === 0 && (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-8 text-center">
          <p className="text-slate-400">No sessions yet.</p>
          <Link href="/admin/sessions/new" className="mt-3 inline-block text-sm text-green-400 hover:text-green-300">
            Create your first session →
          </Link>
        </div>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Upcoming ({upcoming.length})</h2>
          <div className="space-y-2">{upcoming.map(sessionRow)}</div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Past</h2>
          <div className="space-y-2 opacity-60">{past.slice(0, 10).map(sessionRow)}</div>
        </section>
      )}
    </div>
  )
}
