import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { activityTypeLabel, activityTypeIcon, formatDistance } from '@/lib/utils'
import { ActivityType } from '@/generated/prisma'

export const metadata: Metadata = {
  title: 'Segments',
  description: 'Explore Garrincha segments and compete for the fastest times',
}

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getSegments(userId: string) {
  const segments = await prisma.segment.findMany({
    where: { isActive: true },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      distanceKm: true,
      elevationM: true,
      difficulty: true,
      center: { select: { id: true, name: true } },
      _count: { select: { efforts: true } },
      efforts: {
        where: { userId },
        select: { elapsedSecs: true, rank: true, recordedAt: true },
        orderBy: { elapsedSecs: 'asc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return segments
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: 'border-green-600/40 bg-green-600/10 text-green-400',
  MODERATE: 'border-blue-600/40 bg-blue-600/10 text-blue-400',
  HARD: 'border-orange-600/40 bg-orange-600/10 text-orange-400',
  EXTREME: 'border-red-600/40 bg-red-600/10 text-red-400',
}

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SegmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; difficulty?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const sp = await searchParams
  const segments = await getSegments(user.id)

  const filtered = segments.filter(s => {
    if (sp.type && sp.type !== 'ALL' && s.type !== sp.type) return false
    if (sp.difficulty && sp.difficulty !== 'ALL' && s.difficulty !== sp.difficulty) return false
    return true
  })

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Segments</h1>
          <p className="mt-1 text-sm text-slate-400">
            Compete on {segments.length} segments. Your best efforts are highlighted.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { label: 'All Types', href: '/app/segments', active: !sp.type || sp.type === 'ALL' },
            { label: 'Running', href: '/app/segments?type=RUN', active: sp.type === 'RUN' },
            { label: 'Cycling', href: '/app/segments?type=CYCLING', active: sp.type === 'CYCLING' },
            { label: 'Football', href: '/app/segments?type=FOOTBALL_TRAINING', active: sp.type === 'FOOTBALL_TRAINING' },
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

        {/* Segments list */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-700 bg-slate-800 px-6 py-12 text-center">
            <p className="text-slate-400">No segments found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(seg => {
              const myBest = seg.efforts[0]
              const hasAttempt = !!myBest

              return (
                <Link
                  key={seg.id}
                  href={`/app/segments/${seg.id}`}
                  className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 transition-colors hover:border-slate-600 hover:bg-slate-750 sm:flex-row sm:items-center"
                >
                  {/* Left: info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base">{activityTypeIcon(seg.type)}</span>
                      <h3 className="font-semibold text-white">{seg.title}</h3>
                      {seg.difficulty && (
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${DIFFICULTY_COLORS[seg.difficulty] ?? 'border-slate-600 bg-slate-700 text-slate-400'}`}>
                          {seg.difficulty}
                        </span>
                      )}
                    </div>
                    {seg.description && (
                      <p className="mt-1 text-sm text-slate-400 line-clamp-1">{seg.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>{formatDistance(seg.distanceKm)}</span>
                      {seg.elevationM != null && <span>↑ {seg.elevationM}m</span>}
                      <span>{activityTypeLabel(seg.type)}</span>
                      {seg.center && <span>{seg.center.name}</span>}
                      <span>{seg._count.efforts} {seg._count.efforts === 1 ? 'effort' : 'efforts'}</span>
                    </div>
                  </div>

                  {/* Right: your best */}
                  <div className="shrink-0 text-right">
                    {hasAttempt ? (
                      <div>
                        <p className="text-xs text-slate-500">Your Best</p>
                        <p className="text-lg font-bold text-green-400">{formatTime(myBest.elapsedSecs)}</p>
                        {myBest.rank && (
                          <p className="text-xs text-slate-400">Rank #{myBest.rank}</p>
                        )}
                      </div>
                    ) : (
                      <span className="rounded-full border border-slate-600 bg-slate-700 px-3 py-1 text-xs text-slate-400">
                        Not attempted
                      </span>
                    )}
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
