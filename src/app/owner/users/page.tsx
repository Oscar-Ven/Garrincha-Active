import { requireOwner } from '@/lib/owner-auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import { Users, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Users | Owner Console' }

const ROLE_LABELS: Record<string, string> = {
  PLAYER: 'Player',
  CENTER_ADMIN: 'Center Admin',
  PLATFORM_ADMIN: 'Platform Admin',
  SPONSOR_ADMIN: 'Sponsor Admin',
  OWNER: 'Owner',
}

const ROLE_COLORS: Record<string, string> = {
  PLAYER: 'bg-blue-900/30 text-blue-300 border-blue-700/30',
  CENTER_ADMIN: 'bg-green-900/30 text-green-300 border-green-700/30',
  PLATFORM_ADMIN: 'bg-yellow-900/30 text-yellow-300 border-yellow-700/30',
  SPONSOR_ADMIN: 'bg-purple-900/30 text-purple-300 border-purple-700/30',
  OWNER: 'bg-amber-900/30 text-amber-300 border-amber-700/30',
}

async function promoteToAdmin(userId: string) {
  'use server'
  const caller = await getCurrentUser()
  if (!caller || caller.role !== 'OWNER') return
  await prisma.user.update({ where: { id: userId }, data: { role: 'PLATFORM_ADMIN' } })
  await prisma.adminAuditLog.create({
    data: {
      adminId: caller.id,
      action: 'PROMOTE_TO_ADMIN',
      entityType: 'User',
      entityId: userId,
      details: 'Promoted to PLATFORM_ADMIN by owner',
    },
  })
  redirect('/owner/users')
}

async function demoteToPlayer(userId: string) {
  'use server'
  const caller = await getCurrentUser()
  if (!caller || caller.role !== 'OWNER') return
  await prisma.user.update({ where: { id: userId }, data: { role: 'PLAYER' } })
  await prisma.adminAuditLog.create({
    data: {
      adminId: caller.id,
      action: 'DEMOTE_TO_PLAYER',
      entityType: 'User',
      entityId: userId,
      details: 'Demoted to PLAYER by owner',
    },
  })
  redirect('/owner/users')
}

async function toggleUserActive(userId: string, currentlyActive: boolean) {
  'use server'
  const caller = await getCurrentUser()
  if (!caller || caller.role !== 'OWNER') return
  await prisma.user.update({ where: { id: userId }, data: { isActive: !currentlyActive } })
  await prisma.adminAuditLog.create({
    data: {
      adminId: caller.id,
      action: currentlyActive ? 'SUSPEND_USER' : 'ACTIVATE_USER',
      entityType: 'User',
      entityId: userId,
      details: `User ${currentlyActive ? 'suspended' : 'activated'} by owner`,
    },
  })
  redirect('/owner/users')
}

export default async function OwnerUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string; page?: string }>
}) {
  await requireOwner()
  const { role, q, page } = await searchParams
  const pageNum = Math.max(1, parseInt(page ?? '1', 10))
  const take = 25
  const skip = (pageNum - 1) * take

  const where = {
    ...(role && role !== 'all' ? { role: role as never } : {}),
    ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { nickname: { contains: q } }] } : {}),
  }

  const [users, total, roleCounts] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        center: { select: { name: true } },
        playerProfile: { select: { totalPoints: true, totalActivities: true, streakDays: true } },
        _count: { select: { activities: true } },
      },
    }),
    prisma.user.count({ where }),
    Promise.all(
      ['all', 'PLAYER', 'PLATFORM_ADMIN', 'CENTER_ADMIN', 'SPONSOR_ADMIN', 'OWNER'].map(async (r) => ({
        role: r,
        count: await prisma.user.count({ where: r === 'all' ? {} : { role: r as never } }),
      })),
    ),
  ])

  const totalPages = Math.ceil(total / take)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6 text-blue-400" />
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <span className="ml-2 text-sm text-slate-400">({total.toLocaleString()} matching)</span>
      </div>

      {/* Role filter tabs */}
      <div className="flex flex-wrap gap-2">
        {roleCounts.map(({ role: r, count }) => (
          <Link
            key={r}
            href={`/owner/users?role=${r}${q ? `&q=${q}` : ''}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              (role ?? 'all') === r
                ? 'bg-amber-600 border-amber-600 text-white'
                : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
            }`}
          >
            {r === 'all' ? 'All' : ROLE_LABELS[r]} ({count})
          </Link>
        ))}
      </div>

      {/* Search */}
      <form method="GET" action="/owner/users" className="flex gap-2">
        <input type="hidden" name="role" value={role ?? 'all'} />
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search name, email, nickname…"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
        </div>
        <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors">
          Search
        </button>
      </form>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Center</th>
                  <th className="px-4 py-3 text-right">Points</th>
                  <th className="px-4 py-3 text-right">Activities</th>
                  <th className="px-4 py-3 text-right">Streak</th>
                  <th className="px-4 py-3 text-left">Joined</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-white">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                        <p className="text-xs text-slate-600">@{u.nickname}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role] ?? 'bg-slate-800 text-slate-300'}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{u.center?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-white font-mono text-xs">
                      {u.playerProfile?.totalPoints.toLocaleString() ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-white font-mono text-xs">
                      {u._count.activities}
                    </td>
                    <td className="px-4 py-3 text-right text-orange-400 font-mono text-xs">
                      {u.playerProfile?.streakDays ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${u.isActive ? 'text-green-400' : 'text-red-400'}`}>
                        {u.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.role !== 'OWNER' && (
                        <div className="flex gap-1.5">
                          {u.role === 'PLAYER' && (
                            <form action={promoteToAdmin.bind(null, u.id)}>
                              <button type="submit" className="text-xs rounded px-2 py-1 bg-yellow-900/30 text-yellow-300 hover:bg-yellow-900/60 transition-colors border border-yellow-700/30">
                                Make Admin
                              </button>
                            </form>
                          )}
                          {(u.role === 'PLATFORM_ADMIN' || u.role === 'CENTER_ADMIN') && (
                            <form action={demoteToPlayer.bind(null, u.id)}>
                              <button type="submit" className="text-xs rounded px-2 py-1 bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors border border-slate-700">
                                Demote
                              </button>
                            </form>
                          )}
                          <form action={toggleUserActive.bind(null, u.id, u.isActive)}>
                            <button type="submit" className={`text-xs rounded px-2 py-1 transition-colors border ${u.isActive ? 'bg-red-900/30 text-red-300 border-red-700/30 hover:bg-red-900/60' : 'bg-green-900/30 text-green-300 border-green-700/30 hover:bg-green-900/60'}`}>
                              {u.isActive ? 'Suspend' : 'Activate'}
                            </button>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">Page {pageNum} of {totalPages}</p>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <Link href={`/owner/users?role=${role ?? 'all'}&page=${pageNum - 1}${q ? `&q=${q}` : ''}`} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
                Previous
              </Link>
            )}
            {pageNum < totalPages && (
              <Link href={`/owner/users?role=${role ?? 'all'}&page=${pageNum + 1}${q ? `&q=${q}` : ''}`} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
