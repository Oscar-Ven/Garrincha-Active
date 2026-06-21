import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ActivityType } from '@/generated/prisma'
import { activityTypeLabel, formatDistance } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Routes',
  description: 'Discover and save routes for your activities',
}

function activitySymbol(type: ActivityType | string): string {
  const map: Partial<Record<string, string>> = {
    PADEL: 'sports_tennis', TENNIS: 'sports_tennis', PICKLEBALL: 'sports_tennis',
    SQUASH: 'sports_handball', RACQUETBALL: 'sports_handball',
    BADMINTON: 'sports_badminton',
    RUN: 'directions_run', WALK: 'directions_walk',
    CYCLING: 'directions_bike',
    FOOTBALL_TRAINING: 'sports_soccer', FOOTBALL_MATCH: 'sports_soccer',
    FITNESS: 'fitness_center', CUSTOM: 'sports',
  }
  return map[type as string] ?? 'sports'
}

// ─── Data ─────────────────────────────────────────────────────────────────────

function routeThumbPath(pts: { lat: number; lng: number }[]): { d: string; startX: number; startY: number; endX: number; endY: number } | null {
  if (pts.length < 2) return null
  const lats = pts.map((p) => p.lat)
  const lngs = pts.map((p) => p.lng)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const latRange = maxLat - minLat || 0.001
  const lngRange = maxLng - minLng || 0.001
  const PAD = 12, W = 276, H = 96
  const nx = (lng: number) => PAD + ((lng - minLng) / lngRange) * (W - 2 * PAD)
  const ny = (lat: number) => PAD + ((maxLat - lat) / latRange) * (H - 2 * PAD)
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${nx(p.lng).toFixed(1)},${ny(p.lat).toFixed(1)}`).join(' ')
  return { d, startX: nx(pts[0].lng), startY: ny(pts[0].lat), endX: nx(pts[pts.length - 1].lng), endY: ny(pts[pts.length - 1].lat) }
}

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
        points: { select: { lat: true, lng: true }, orderBy: { sequence: 'asc' } },
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
  EASY:     'border-primary-fixed/40 bg-primary-fixed/10 text-primary-fixed',
  MODERATE: 'border-secondary/40 bg-secondary/10 text-secondary',
  HARD:     'border-[#FFD700]/40 bg-[#FFD700]/10 text-[#FFD700]',
  EXTREME:  'border-error/40 bg-error/10 text-error',
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
            <h1 className="text-2xl font-bold text-on-surface">Routes</h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              {routes.length} routes available · {saved.size} saved by you
            </p>
          </div>
          <Link
            href="/app/routes/new"
            className="shrink-0 rounded-xl bg-primary-fixed px-4 py-2 text-sm font-semibold text-on-primary-fixed hover:bg-primary-fixed-dim transition-colors"
          >
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
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'border-primary-fixed bg-primary-fixed text-on-primary-fixed'
                  : 'glass-card text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Route grid */}
        {filtered.length === 0 ? (
          <div className="glass-card rounded-xl px-6 py-12 text-center">
            <p className="text-on-surface-variant">No routes found.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map(route => {
              const isSaved = saved.has(route.id)
              return (
                <Link
                  key={route.id}
                  href={`/app/routes/${route.id}`}
                  className="glass-card flex flex-col gap-3 rounded-xl p-5 transition-colors hover:bg-surface-container-high"
                >
                  {/* Route thumbnail */}
                  {(() => {
                    const thumb = routeThumbPath(route.points)
                    return (
                      <div className="relative h-28 w-full overflow-hidden rounded-lg bg-linear-to-br from-primary-fixed/5 via-surface-container to-surface-container-high">
                        <div
                          className="pointer-events-none absolute inset-0 opacity-10"
                          style={{
                            backgroundImage: 'linear-gradient(#c3f400 1px, transparent 1px), linear-gradient(90deg, #c3f400 1px, transparent 1px)',
                            backgroundSize: '16px 16px',
                          }}
                        />
                        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 300 120" fill="none">
                          {thumb ? (
                            <>
                              <path d={thumb.d} stroke="#c3f400" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
                              <circle cx={thumb.startX} cy={thumb.startY} r="4" fill="#c3f400" />
                              <circle cx={thumb.endX} cy={thumb.endY} r="4" fill="#FFD700" />
                            </>
                          ) : (
                            <path d="M20,90 C60,80 100,50 140,60 S200,30 240,40 S270,20 290,15" stroke="#c3f400" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
                          )}
                        </svg>
                        {isSaved && (
                          <span className="absolute right-2 top-2 rounded-full bg-[#FFD700]/80 px-2 py-0.5 text-[10px] font-bold text-on-primary-fixed">
                            Saved
                          </span>
                        )}
                      </div>
                    )
                  })()}

                  {/* Info */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-on-surface leading-tight">{route.title}</h3>
                      {route.difficulty && (
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${DIFFICULTY_COLORS[route.difficulty] ?? 'glass-card text-on-surface-variant'}`}>
                          {route.difficulty}
                        </span>
                      )}
                    </div>
                    {route.description && (
                      <p className="mt-1 text-xs text-on-surface-variant line-clamp-2">{route.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: '13px', fontVariationSettings: "'FILL' 1" }}>
                          {activitySymbol(route.type)}
                        </span>
                        {activityTypeLabel(route.type)}
                      </span>
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
