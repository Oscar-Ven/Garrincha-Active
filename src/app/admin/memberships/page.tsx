import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { MembershipStatus } from '@/generated/prisma'

export const metadata = { title: 'Memberships | Admin' }

const STATUS_COLOR: Record<MembershipStatus, string> = {
  PENDING: 'text-yellow-400 border-yellow-600/40 bg-yellow-600/10',
  ACTIVE: 'text-green-400 border-green-600/40 bg-green-600/10',
  EXPIRED: 'text-slate-400 border-slate-600/40 bg-slate-600/10',
  CANCELLED: 'text-red-400 border-red-600/40 bg-red-600/10',
}

export default async function AdminMembershipsPage() {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'PLATFORM_ADMIN' && user.role !== 'OWNER' && user.role !== 'CENTER_ADMIN')) {
    redirect('/app')
  }

  const [memberships, centers, plans] = await Promise.all([
    prisma.membership.findMany({
      include: {
        user: { select: { id: true, name: true, nickname: true, email: true } },
        plan: { select: { id: true, name: true } },
        center: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.center.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.membershipPlan.findMany({
      where: { isActive: true },
      select: { id: true, name: true, centerId: true, durationDays: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const now = new Date()
  const active = memberships.filter((m) => m.status === MembershipStatus.ACTIVE)
  const expired = memberships.filter((m) => m.status === MembershipStatus.EXPIRED || (m.status === MembershipStatus.ACTIVE && m.expiryDate < now))
  const other = memberships.filter((m) => m.status === MembershipStatus.PENDING || m.status === MembershipStatus.CANCELLED)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Memberships</h1>
          <p className="text-sm text-slate-400">{memberships.length} total · {active.length} active</p>
        </div>
        <Link
          href="/admin/memberships/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Membership
        </Link>
      </div>

      {memberships.length === 0 ? (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-10 text-center">
          <p className="text-slate-400">No memberships yet.</p>
          <p className="mt-1 text-sm text-slate-500">Assign a membership to a player to get started.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/80">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Player</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Center</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Expires</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {memberships.map((m) => (
                <tr key={m.id} className="bg-slate-800/30 hover:bg-slate-800/60 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/players/${m.userId}`} className="hover:text-green-400 transition-colors">
                      <p className="font-medium text-white">{m.user.name}</p>
                      <p className="text-xs text-slate-500">@{m.user.nickname ?? m.user.email}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{m.center.name}</td>
                  <td className="px-4 py-3 text-slate-300">{m.plan?.name ?? <span className="text-slate-500">Custom</span>}</td>
                  <td className="px-4 py-3 text-slate-300">
                    <span className={m.expiryDate < now ? 'text-red-400' : ''}>
                      {m.expiryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[m.status]}`}>
                      {m.status.charAt(0) + m.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
