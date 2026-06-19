import { requireOwner } from '@/lib/owner-auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { ScrollText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Audit Log | Owner Console' }

const ACTION_COLORS: Record<string, string> = {
  APPROVE_ACTIVITY: 'text-green-400',
  REJECT_ACTIVITY: 'text-red-400',
  CREATE_CENTER: 'text-purple-400',
  UPDATE_CENTER: 'text-blue-400',
  CREATE_REWARD: 'text-amber-400',
  AWARD_BADGE: 'text-yellow-400',
  AWARD_POINTS: 'text-green-300',
  SETTLE_AUCTION: 'text-orange-400',
  PROMOTE_TO_ADMIN: 'text-amber-400',
  DEMOTE_TO_PLAYER: 'text-slate-400',
  SUSPEND_USER: 'text-red-400',
  ACTIVATE_USER: 'text-green-400',
}

export default async function OwnerAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ admin?: string; action?: string; page?: string }>
}) {
  await requireOwner()
  const { admin, action, page } = await searchParams
  const pageNum = Math.max(1, parseInt(page ?? '1', 10))
  const take = 30
  const skip = (pageNum - 1) * take

  const where = {
    ...(admin ? { adminId: admin } : {}),
    ...(action ? { action } : {}),
  }

  const [logs, total, admins, actions] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: { admin: { select: { id: true, name: true, email: true, role: true } } },
    }),
    prisma.adminAuditLog.count({ where }),
    prisma.user.findMany({
      where: { role: { in: ['PLATFORM_ADMIN', 'CENTER_ADMIN', 'OWNER'] } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.adminAuditLog.groupBy({
      by: ['action'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
  ])

  const totalPages = Math.ceil(total / take)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ScrollText className="h-6 w-6 text-slate-400" />
        <h1 className="text-2xl font-bold text-white">Audit Log</h1>
        <span className="text-sm text-slate-400 ml-2">({total.toLocaleString()} entries)</span>
      </div>

      {/* Filters */}
      <form method="GET" action="/owner/audit" className="flex flex-wrap gap-3">
        <select
          name="admin"
          defaultValue={admin ?? ''}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-600"
        >
          <option value="">All Admins</option>
          {admins.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <select
          name="action"
          defaultValue={action ?? ''}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-600"
        >
          <option value="">All Actions</option>
          {actions.map((a) => (
            <option key={a.action} value={a.action}>{a.action.replace(/_/g, ' ')} ({a._count.id})</option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors">
          Filter
        </button>
        {(admin || action) && (
          <Link href="/owner/audit" className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
            Clear
          </Link>
        )}
      </form>

      {/* Action summary */}
      <div className="flex flex-wrap gap-2">
        {actions.slice(0, 8).map((a) => (
          <Link
            key={a.action}
            href={`/owner/audit?action=${a.action}`}
            className={`rounded-full border border-slate-700 px-3 py-1 text-xs hover:border-amber-600 transition-colors ${action === a.action ? 'bg-amber-600 text-white border-amber-600' : 'text-slate-400'}`}
          >
            {a.action.replace(/_/g, ' ')} ({a._count.id})
          </Link>
        ))}
      </div>

      {/* Log table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Timestamp</th>
                  <th className="px-4 py-3 text-left">Admin</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Entity</th>
                  <th className="px-4 py-3 text-left">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap font-mono">
                      {new Date(log.createdAt).toLocaleString('en-GB', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white text-xs font-medium">{log.admin.name}</p>
                      <p className="text-slate-500 text-xs">{log.admin.role}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${ACTION_COLORS[log.action] ?? 'text-slate-300'}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {log.entityType && <span className="font-medium text-slate-300">{log.entityType}</span>}
                      {log.entityId && <p className="font-mono truncate max-w-24">{log.entityId.slice(0, 12)}…</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">
                      {log.details ?? '—'}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No audit entries match filters</td>
                  </tr>
                )}
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
              <Link href={`/owner/audit?page=${pageNum - 1}${admin ? `&admin=${admin}` : ''}${action ? `&action=${action}` : ''}`} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
                Previous
              </Link>
            )}
            {pageNum < totalPages && (
              <Link href={`/owner/audit?page=${pageNum + 1}${admin ? `&admin=${admin}` : ''}${action ? `&action=${action}` : ''}`} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
