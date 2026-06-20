import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { activityTypeLabel, activityTypeIcon, formatDistance } from '@/lib/utils'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const seg = await prisma.segment.findUnique({ where: { id }, select: { title: true } })
  return { title: seg?.title ?? 'Segment' }
}

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getSegment(id: string, userId: string) {
  const [segment, myBest] = await Promise.all([
    prisma.segment.findUnique({
      where: { id },
      select: {
        id: true, title: true, description: true, type: true,
        distanceKm: true, elevationM: true, difficulty: true, isActive: true,
        center: { select: { id: true, name: true, city: true } },
        createdBy: { select: { id: true, name: true, nickname: true } },
        createdAt: true,
        efforts: {
          select: {
            id: true, elapsedSecs: true, rank: true, recordedAt: true,
            user: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
          },
          orderBy: { elapsedSecs: 'asc' },
          take: 20,
        },
        _count: { select: { efforts: true } },
      },
    }),
    prisma.segmentEffort.findFirst({
      where: { segmentId: id, userId },
      orderBy: { elapsedSecs: 'asc' },
    }),
  ])
  return { segment, myBest }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: 'text-green-400', MODERATE: 'text-blue-400', HARD: 'text-orange-400', EXTREME: 'text-red-400',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SegmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { id } = await params
  const { segment, myBest } = await getSegment(id, user.id)

  if (!segment) notFound()

  const topEffort = segment.efforts[0]
  const myRank = myBest ? segment.efforts.findIndex(e => e.elapsedSecs >= myBest.elapsedSecs) + 1 : null

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">

        {/* Back */}
        <div className="mb-6">
          <Link href="/app/segments" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Segments
          </Link>
        </div>

        {/* Header card */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xl">{activityTypeIcon(segment.type)}</span>
            <span className="text-sm text-slate-400">{activityTypeLabel(segment.type)}</span>
            {segment.difficulty && (
              <span className={`ml-auto text-sm font-semibold ${DIFFICULTY_COLORS[segment.difficulty] ?? 'text-slate-400'}`}>
                {segment.difficulty}
              </span>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-bold text-white">{segment.title}</h1>
          {segment.description && (
            <p className="mt-2 text-sm text-slate-300">{segment.description}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
            <span>{formatDistance(segment.distanceKm)}</span>
            {segment.elevationM != null && <span>Elevation ↑{segment.elevationM}m</span>}
            {segment.center && <span>{segment.center.name}{segment.center.city ? `, ${segment.center.city}` : ''}</span>}
            <span>{segment._count.efforts} total efforts</span>
          </div>
        </div>

        {/* Mock map */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
          <div className="flex items-center gap-2 border-b border-slate-700 px-5 py-3">
            <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-semibold text-slate-200">Segment Map</span>
          </div>
          <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-green-950/30 via-slate-800 to-slate-900">
            <div className="pointer-events-none absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#16a34a 1px, transparent 1px), linear-gradient(90deg, #16a34a 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-30" viewBox="0 0 400 160" fill="none">
              <path d="M 20 120 L 80 100 L 160 80 L 240 60 L 320 50 L 380 40" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" />
              <circle cx="20" cy="120" r="5" fill="#16a34a" />
              <circle cx="380" cy="40" r="5" fill="#ca8a04" />
            </svg>
            <p className="relative text-xs text-slate-500">Route map placeholder</p>
          </div>
        </div>

        {/* My effort */}
        {myBest ? (
          <div className="mt-4 rounded-xl border border-green-600/40 bg-green-600/10 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-green-500">Your Personal Best</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-3xl font-bold text-white">{formatTime(myBest.elapsedSecs)}</p>
              {myRank && (
                <div className="text-right">
                  <p className="text-xs text-slate-400">Leaderboard rank</p>
                  <p className="text-xl font-bold text-yellow-400">#{myRank}</p>
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Recorded {new Date(myBest.recordedAt).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800 px-5 py-4 text-center">
            <p className="text-sm text-slate-400">You haven&apos;t attempted this segment yet.</p>
            <Link href="/app/activities/new" className="mt-3 inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
              Log Activity to Attempt
            </Link>
          </div>
        )}

        {/* Leaderboard */}
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Leaderboard — Top {segment.efforts.length}
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="w-10 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Athlete</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">Time</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400 hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {segment.efforts.map((effort, i) => {
                  const isMe = effort.user.id === user.id
                  const isKOM = i === 0
                  return (
                    <tr key={effort.id} className={`${isMe ? 'bg-green-900/20' : ''} hover:bg-white/5`}>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-bold ${isKOM ? 'text-yellow-400' : 'text-slate-400'}`}>
                          {isKOM ? '👑' : `#${i + 1}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/app/profile`} className="flex items-center gap-2 hover:underline">
                          <div className="h-7 w-7 rounded-full bg-green-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {effort.user.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <span className="font-medium text-slate-100">{effort.user.name}</span>
                            {isMe && <span className="ml-1.5 text-xs text-green-400">(you)</span>}
                            <p className="text-xs text-slate-500">@{effort.user.nickname}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-white">
                        {formatTime(effort.elapsedSecs)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-slate-500 hidden sm:table-cell">
                        {new Date(effort.recordedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  )
}
