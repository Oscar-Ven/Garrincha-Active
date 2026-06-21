import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { MembershipStatus } from '@/generated/prisma'

export const metadata = { title: 'Membership | Garrincha Active' }

const STATUS_LABEL: Record<MembershipStatus, string> = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
}

const STATUS_COLOR: Record<MembershipStatus, string> = {
  PENDING: 'text-yellow-400 border-yellow-600/40 bg-yellow-600/10',
  ACTIVE: 'text-green-400 border-green-600/40 bg-green-600/10',
  EXPIRED: 'text-slate-400 border-slate-600/40 bg-slate-600/10',
  CANCELLED: 'text-red-400 border-red-600/40 bg-red-600/10',
}

export default async function MembershipPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: {
      plan: { select: { name: true, description: true, durationDays: true, maxSessions: true } },
      center: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const active = memberships.filter(
    (m) => m.status === MembershipStatus.ACTIVE && m.expiryDate >= new Date(),
  )
  const past = memberships.filter(
    (m) => m.status !== MembershipStatus.ACTIVE || m.expiryDate < new Date(),
  )

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white">My Membership</h1>
        <p className="mt-1 text-sm text-slate-400">
          Your club memberships and access status
        </p>
      </div>

      {/* Active memberships */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Active
        </h2>

        {active.length === 0 ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-8 text-center">
            <div className="mb-3 text-4xl">🏟️</div>
            <p className="font-semibold text-white">No active membership</p>
            <p className="mt-1 text-sm text-slate-400">
              Ask your center to assign a membership, or visit the front desk.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {active.map((m) => {
              const daysLeft = Math.ceil(
                (m.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
              )
              const sessionsLeft =
                m.plan?.maxSessions != null
                  ? m.plan.maxSessions - m.sessionsUsed
                  : null
              return (
                <div
                  key={m.id}
                  className="rounded-2xl border border-green-600/30 bg-green-600/5 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-bold text-white">
                        {m.plan?.name ?? 'Custom Membership'}
                      </p>
                      <p className="text-sm text-slate-400">{m.center.name}</p>
                      {m.plan?.description && (
                        <p className="mt-1 text-sm text-slate-400">{m.plan.description}</p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_COLOR[m.status]}`}
                    >
                      {STATUS_LABEL[m.status]}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-800/60 px-4 py-3 text-center">
                      <p className="text-2xl font-bold text-green-400">{daysLeft}</p>
                      <p className="text-xs text-slate-400">days left</p>
                    </div>
                    {sessionsLeft !== null && (
                      <div className="rounded-xl bg-slate-800/60 px-4 py-3 text-center">
                        <p className="text-2xl font-bold text-white">{sessionsLeft}</p>
                        <p className="text-xs text-slate-400">sessions left</p>
                      </div>
                    )}
                    <div className="rounded-xl bg-slate-800/60 px-4 py-3 text-center">
                      <p className="text-sm font-semibold text-white">
                        {m.expiryDate.toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-slate-400">expires</p>
                    </div>
                  </div>

                  {m.notes && (
                    <p className="mt-3 text-xs text-slate-500 border-t border-slate-700/50 pt-3">
                      {m.notes}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Past memberships */}
      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Past memberships
          </h2>
          <div className="space-y-2">
            {past.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-800/30 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-300">
                    {m.plan?.name ?? 'Custom Membership'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {m.center.name} ·{' '}
                    {m.startDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                    {' – '}
                    {m.expiryDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[m.status]}`}
                >
                  {STATUS_LABEL[m.status]}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
