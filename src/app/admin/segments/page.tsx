import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { activityTypeLabel, formatDistance } from '@/lib/utils'

export const metadata: Metadata = { title: 'Admin — Segments' }

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getSegments() {
  return prisma.segment.findMany({
    select: {
      id: true, title: true, type: true, distanceKm: true, elevationM: true,
      difficulty: true, isActive: true, createdAt: true,
      center: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { efforts: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// ─── Toggle action ────────────────────────────────────────────────────────────

async function toggleActive(segmentId: string, current: boolean) {
  'use server'
  await prisma.segment.update({ where: { id: segmentId }, data: { isActive: !current } })
  redirect('/admin/segments')
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminSegmentsPage() {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'PLATFORM_ADMIN' && user.role !== 'CENTER_ADMIN')) {
    redirect('/login')
  }

  const segments = await getSegments()

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Segments</h1>
            <p className="mt-1 text-sm text-slate-400">{segments.length} segments total</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Segments', value: segments.length },
            { label: 'Active', value: segments.filter(s => s.isActive).length },
            { label: 'Total Efforts', value: segments.reduce((s, seg) => s + seg._count.efforts, 0) },
            { label: 'Inactive', value: segments.filter(s => !s.isActive).length },
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
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Segment</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Distance</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Difficulty</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Center</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">Efforts</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {segments.map(seg => {
                const toggleFn = toggleActive.bind(null, seg.id, seg.isActive)
                return (
                  <tr key={seg.id} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-100">{seg.title}</p>
                      <p className="text-xs text-slate-500">by {seg.createdBy.name}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{activityTypeLabel(seg.type)}</td>
                    <td className="px-4 py-3 text-slate-300">{formatDistance(seg.distanceKm)}</td>
                    <td className="px-4 py-3">
                      {seg.difficulty ? (
                        <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                          {seg.difficulty}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{seg.center?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{seg._count.efforts}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${seg.isActive ? 'bg-green-600/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                        {seg.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={toggleFn} className="inline">
                        <button type="submit" className="rounded border border-slate-600 bg-slate-700 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-600">
                          {seg.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </form>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {segments.length === 0 && (
            <div className="px-6 py-12 text-center text-slate-400">
              No segments yet.
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Segments are created by platform admins. Players compete on segments through their activity logs.
        </p>

      </div>
    </div>
  )
}
