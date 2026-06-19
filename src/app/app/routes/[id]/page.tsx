import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { activityTypeLabel, activityTypeIcon, formatDistance } from '@/lib/utils'
import { RouteMap } from '@/components/maps/RouteMap'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const route = await prisma.route.findUnique({ where: { id }, select: { title: true } })
  return { title: route?.title ?? 'Route' }
}

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getRoute(id: string, userId: string) {
  const [route, savedRoute] = await Promise.all([
    prisma.route.findUnique({
      where: { id },
      select: {
        id: true, title: true, description: true, type: true,
        distanceKm: true, elevationM: true, difficulty: true, isPublic: true,
        center: { select: { id: true, name: true, city: true } },
        createdBy: { select: { id: true, name: true, nickname: true } },
        points: { orderBy: { sequence: 'asc' }, select: { sequence: true, lat: true, lng: true, elevM: true } },
        _count: { select: { savedBy: true } },
        createdAt: true,
      },
    }),
    prisma.savedRoute.findUnique({ where: { userId_routeId: { userId, routeId: id } } }),
  ])

  return { route, isSaved: !!savedRoute }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: 'text-green-400', MODERATE: 'text-blue-400', HARD: 'text-orange-400', EXTREME: 'text-red-400',
}

// ─── Save action ──────────────────────────────────────────────────────────────

async function toggleSave(routeId: string, userId: string, isSaved: boolean) {
  'use server'
  if (isSaved) {
    await prisma.savedRoute.deleteMany({ where: { userId, routeId } })
  } else {
    await prisma.savedRoute.upsert({
      where: { userId_routeId: { userId, routeId } },
      update: {},
      create: { userId, routeId },
    })
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RouteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { id } = await params
  const { route, isSaved } = await getRoute(id, user.id)

  if (!route) notFound()

  const toggleSaveForUser = toggleSave.bind(null, route.id, user.id, isSaved)

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">

      {/* Back */}
        <div className="mb-6">
          <Link href="/app/routes" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Routes
          </Link>
        </div>

        {/* Header */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">{activityTypeIcon(route.type)}</span>
            <span className="text-sm text-slate-400">{activityTypeLabel(route.type)}</span>
            {route.difficulty && (
              <span className={`ml-auto text-sm font-semibold ${DIFFICULTY_COLORS[route.difficulty] ?? 'text-slate-400'}`}>
                {route.difficulty}
              </span>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-bold text-white">{route.title}</h1>
          {route.description && (
            <p className="mt-2 text-sm text-slate-300">{route.description}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-400">
            <span>{formatDistance(route.distanceKm)}</span>
            {route.elevationM != null && <span>Elevation ↑{route.elevationM}m</span>}
            {route.center && <span>{route.center.name}{route.center.city ? `, ${route.center.city}` : ''}</span>}
            <span>{route._count.savedBy} saved</span>
            <span>{route.points.length} waypoints</span>
          </div>

          <div className="mt-5 flex items-center gap-3 border-t border-slate-700 pt-5">
            <form action={toggleSaveForUser}>
              <button
                type="submit"
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${isSaved ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' : 'border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600 hover:text-white'}`}
              >
                {isSaved ? '★ Saved' : '☆ Save Route'}
              </button>
            </form>
            <Link
              href="/app/activities/new"
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Use This Route
            </Link>
          </div>
        </div>

        {/* Route map */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
          <div className="flex items-center gap-2 border-b border-slate-700 px-5 py-3">
            <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="text-sm font-semibold text-slate-200">Route Map</span>
            <span className="ml-auto text-xs text-slate-500">{route.points.length} waypoints</span>
          </div>
          <div className="h-72">
            <RouteMap points={route.points} />
          </div>
        </div>

        {/* Waypoints table */}
        {route.points.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Waypoints</h2>
            <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Latitude</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Longitude</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-slate-400">Elevation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {route.points.map((p, i) => (
                    <tr key={p.sequence} className={`hover:bg-white/5 ${i === 0 || i === route.points.length - 1 ? 'bg-green-900/10' : ''}`}>
                      <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">
                        {i === 0 ? '▶ Start' : i === route.points.length - 1 ? '⬛ End' : `P${i + 1}`}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-300">{p.lat.toFixed(5)}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-300">{p.lng.toFixed(5)}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-slate-400">
                        {p.elevM != null ? `${p.elevM.toFixed(0)}m` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Creator */}
        <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
          <span>Created by</span>
          <span className="text-slate-400">{route.createdBy.name}</span>
          <span>·</span>
          <span>{new Date(route.createdAt).toLocaleDateString()}</span>
        </div>

    </div>
  )
}
