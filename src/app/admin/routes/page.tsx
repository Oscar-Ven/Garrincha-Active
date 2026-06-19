import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { activityTypeLabel, formatDistance } from '@/lib/utils'

export const metadata: Metadata = { title: 'Admin — Routes' }

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getRoutes() {
  return prisma.route.findMany({
    select: {
      id: true, title: true, type: true, distanceKm: true, elevationM: true,
      difficulty: true, isPublic: true, createdAt: true,
      center: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { savedBy: true, points: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// ─── Toggle action ────────────────────────────────────────────────────────────

async function togglePublic(routeId: string, current: boolean) {
  'use server'
  await prisma.route.update({ where: { id: routeId }, data: { isPublic: !current } })
  redirect('/admin/routes')
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminRoutesPage() {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'PLATFORM_ADMIN' && user.role !== 'CENTER_ADMIN')) {
    redirect('/login')
  }

  const routes = await getRoutes()

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Routes</h1>
            <p className="mt-1 text-sm text-slate-400">{routes.length} routes total</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Routes', value: routes.length },
            { label: 'Public', value: routes.filter(r => r.isPublic).length },
            { label: 'Total Saves', value: routes.reduce((s, r) => s + r._count.savedBy, 0) },
            { label: 'Total Waypoints', value: routes.reduce((s, r) => s + r._count.points, 0) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-1 text-2xl font-bold text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Route</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Distance</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Difficulty</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Center</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">Saves</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">Waypoints</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">Visibility</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {routes.map(route => {
                const toggleFn = togglePublic.bind(null, route.id, route.isPublic)
                return (
                  <tr key={route.id} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-100">{route.title}</p>
                      <p className="text-xs text-slate-500">by {route.createdBy.name}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{activityTypeLabel(route.type)}</td>
                    <td className="px-4 py-3 text-slate-300">{formatDistance(route.distanceKm)}</td>
                    <td className="px-4 py-3">
                      {route.difficulty ? (
                        <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">{route.difficulty}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{route.center?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{route._count.savedBy}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{route._count.points}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${route.isPublic ? 'bg-green-600/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                        {route.isPublic ? 'Public' : 'Private'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={toggleFn} className="inline">
                        <button type="submit" className="rounded border border-slate-600 bg-slate-700 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-600">
                          {route.isPublic ? 'Make Private' : 'Make Public'}
                        </button>
                      </form>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {routes.length === 0 && (
            <div className="px-6 py-12 text-center text-slate-400">No routes yet.</div>
          )}
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Routes are created by center admins and can be saved by players for their activities.
        </p>

      </div>
    </div>
  )
}
