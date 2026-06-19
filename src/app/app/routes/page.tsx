import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { activityTypeLabel, activityTypeIcon, formatDistance } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Routes',
  description: 'Discover and save routes for your activities',
}

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getRoutes(userId: string) {
  const [routes, savedRouteIds] = await Promise.all([
    prisma.route.findMany({
      where: { isPublic: true },
      select: {
        id: true, title: true, description: true, type: true,
        distanceKm: true, elevationM: true, difficulty: true,
        center: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, nickname: true } },
        _count: { select: { savedBy: true, points: true } },
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.savedRoute.findMany({
      where: { userId },
      select: { routeId: true },
    }),
  ])

  const saved = new Set(savedRouteIds.map(r => r.routeId))
  return { routes, saved }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: 'border-green-600/40 bg-green-600/10 text-green-400',
  MODERATE: 'border-blue-600/40 bg-blue-600/10 text-blue-400',
  HARD: 'border-orange-600/40 bg-orange-600/10 text-orange-400',
  EXTREME: 'border-red-600/40 bg-red-600/10 text-red-400',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RoutesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; saved?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const sp = await searchParams
  const { routes, saved } = await getRoutes(user.id)

  const filtered = routes.filter(r => {
    if (sp.type && sp.type !== 'ALL' && r.type !== sp.type) return false
    if (sp.saved === '1' && !saved.has(r.id)) return false
    return true
  })

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6">
      <div>

        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Routes</h1>
            <p className="mt-1 text-sm text-slate-400">
              {routes.length} routes available · {saved.size} saved by you
            </p>
          </div>
          <Link href="/app/routes/new" className="shrink-0 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors">
            + Create
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { label: 'All Routes', href: '/app/routes', active: !sp.type && !sp.saved },
            { label: 'Running', href: '/app/routes?type=RUN', active: sp.type === 'RUN' },
            { label: 'Cycling', href: '/app/routes?type=CYCLING', active: sp.type === 'CYCLING' },
            { label: 'Saved', href: '/app/routes?saved=1', active: sp.saved === '1' },
          ].map(({ label, href, active }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${active ? 'border-green-600 bg-green-600 text-white' : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-white'}`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Route grid */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-700 bg-slate-800 px-6 py-12 text-center">
            <p className="text-slate-400">No routes found.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map(route => {
              const isSaved = saved.has(route.id)
              return (
                <Link
                  key={route.id}
                  href={`/app/routes/${route.id}`}
                  className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-800 p-5 transition-colors hover:border-slate-600 hover:bg-slate-750"
                >
                  {/* Mock map thumbnail */}
                  <div className="relative h-28 w-full overflow-hidden rounded-lg bg-gradient-to-br from-green-950/40 via-slate-700 to-slate-800">
                    <div className="pointer-events-none absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#16a34a 1px, transparent 1px), linear-gradient(90deg, #16a34a 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-40" viewBox="0 0 300 120" fill="none">
                      <path d="M 20 90 C 60 80 100 50 140 60 S 200 30 240 40 S 270 20 290 15" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
                      <circle cx="20" cy="90" r="4" fill="#16a34a" />
                      <circle cx="290" cy="15" r="4" fill="#ca8a04" />
                    </svg>
                    {isSaved && (
                      <span className="absolute right-2 top-2 rounded-full bg-yellow-500/80 px-2 py-0.5 text-[10px] font-bold text-slate-900">
                        Saved
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-white leading-tight">{route.title}</h3>
                      {route.difficulty && (
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${DIFFICULTY_COLORS[route.difficulty] ?? 'border-slate-600 text-slate-400'}`}>
                          {route.difficulty}
                        </span>
                      )}
                    </div>
                    {route.description && (
                      <p className="mt-1 text-xs text-slate-400 line-clamp-2">{route.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>{activityTypeIcon(route.type)} {activityTypeLabel(route.type)}</span>
                      <span>{formatDistance(route.distanceKm)}</span>
                      {route.elevationM != null && <span>↑{route.elevationM}m</span>}
                      {route.center && <span>{route.center.name}</span>}
                      <span>{route._count.savedBy} saved</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
