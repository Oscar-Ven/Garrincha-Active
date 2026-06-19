import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { cn, activityTypeLabel, activityTypeIcon, formatDate, formatDateTime, formatDuration, formatDistance, formatPace } from '@/lib/utils'
import { ActivityStatus, ActivityType } from '@/generated/prisma'
import { formatDistanceToNow } from 'date-fns'
import { ActivityMap } from '@/components/maps/ActivityMap'

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getActivity(id: string) {
  return prisma.activity.findUnique({
    where: { id },
    select: {
      id: true, title: true, type: true, startedAt: true, endedAt: true,
      durationMinutes: true, distanceKm: true, paceMinPerKm: true, speedKmH: true,
      caloriesBurned: true, elevationGainM: true, effortLevel: true,
      heartRateAvg: true, heartRateMax: true, cadence: true, powerWatts: true, temperature: true,
      gear: true, description: true, visibility: true, status: true,
      pointsEarned: true, flagReason: true, createdAt: true, userId: true,
      user: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
      media: { select: { id: true, url: true, type: true }, orderBy: { createdAt: 'asc' } },
      routePoints: {
        orderBy: { sequence: 'asc' },
        select: { latitude: true, longitude: true, altitude: true },
      },
      tags: {
        include: { tagged: { select: { id: true, name: true, nickname: true } } },
        orderBy: { createdAt: 'asc' },
      },
      splits: {
        orderBy: { splitNumber: 'asc' },
        select: { splitNumber: true, distanceKm: true, elapsedSecs: true, paceSecPerKm: true, elevationGainM: true },
      },
      segmentEfforts: {
        select: {
          id: true, elapsedSecs: true, rank: true,
          segment: { select: { id: true, title: true, distanceKm: true, difficulty: true } },
        },
      },
      personalRecords: { select: { id: true, type: true, value: true } },
      feedPost: {
        select: {
          id: true,
          comments: {
            where: { moderationStatus: 'VISIBLE' },
            orderBy: { createdAt: 'asc' },
            select: {
              id: true, content: true, createdAt: true,
              user: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
            },
          },
          _count: { select: { reactions: true } },
        },
      },
    },
  })
}

type Activity = NonNullable<Awaited<ReturnType<typeof getActivity>>>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function activityTypeBadgeVariant(type: ActivityType): 'default' | 'secondary' | 'gold' | 'outline' {
  switch (type) {
    case ActivityType.FOOTBALL_MATCH:
    case ActivityType.FOOTBALL_TRAINING: return 'default'
    case ActivityType.RUN:
    case ActivityType.CYCLING: return 'secondary'
    case ActivityType.FITNESS: return 'gold'
    default: return 'outline'
  }
}

function statusBadge(status: ActivityStatus) {
  switch (status) {
    case ActivityStatus.APPROVED:
      return <span className="inline-flex items-center gap-1.5 rounded-full border border-green-600/40 bg-green-600/10 px-3 py-1 text-xs font-semibold text-green-400"><span className="h-1.5 w-1.5 rounded-full bg-green-400" />Approved</span>
    case ActivityStatus.PENDING:
      return <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />Pending Review</span>
    case ActivityStatus.FLAGGED:
      return <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-400" />Flagged</span>
    case ActivityStatus.REJECTED:
      return <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-700/50 px-3 py-1 text-xs font-semibold text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-slate-500" />Rejected</span>
  }
}

function formatSplitTime(secs: number) { const m = Math.floor(secs / 60); const s = secs % 60; return `${m}:${String(s).padStart(2, '0')}` }
function formatPaceSec(s: number) { const m = Math.floor(s / 60); const r = s % 60; return `${m}:${String(r).padStart(2, '0')}/km` }

const PR_LABELS: Record<string, string> = {
  FASTEST_1KM: 'Fastest 1km', FASTEST_5KM: 'Fastest 5km', FASTEST_10KM: 'Fastest 10km',
  LONGEST_RUN: 'Longest Run', LONGEST_RIDE: 'Longest Ride', MOST_ACTIVITIES_WEEK: 'Most Active Week',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatItem({ icon, label, value, subValue }: { icon: React.ReactNode; label: string; value: string; subValue?: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3">
      <div className="flex items-center gap-2 text-slate-400">{icon}<span className="text-xs font-medium uppercase tracking-wide">{label}</span></div>
      <p className="text-lg font-bold text-white">{value}</p>
      {subValue && <p className="text-xs text-slate-500">{subValue}</p>}
    </div>
  )
}

function Avatar({ name, avatarUrl, size = 8 }: { name: string; avatarUrl: string | null; size?: number }) {
  const s = `h-${size} w-${size}`
  if (avatarUrl) return <img src={avatarUrl} alt={name} className={`${s} rounded-full object-cover`} />
  return <div className={`${s} flex shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white`}>{name[0]}</div>
}

// SVG icons
function Icon({ d, className }: { d: string; className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const activity = await getActivity(id)
  if (!activity) return { title: 'Activity Not Found' }
  return { title: activity.title, description: `${activityTypeLabel(activity.type)} by ${activity.user.name}` }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [activity, currentUser] = await Promise.all([getActivity(id), getCurrentUser()])
  if (!activity) notFound()

  const isOwner = currentUser?.id === activity.userId
  const isFlagged = activity.status === ActivityStatus.FLAGGED
  const hasRoute = activity.routePoints.length > 0
  const routePointCount = activity.routePoints.length
  const mapPoints = activity.routePoints.map((rp) => ({ lat: rp.latitude, lng: rp.longitude, alt: rp.altitude }))
  const comments = activity.feedPost?.comments ?? []
  const kudosCount = activity.feedPost?._count.reactions ?? 0

  // Build stats list
  const stats: Array<{ icon: React.ReactNode; label: string; value: string; subValue?: string }> = [
    { icon: <Icon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" className="h-4 w-4" />, label: 'Duration', value: formatDuration(activity.durationMinutes) },
  ]
  if (activity.distanceKm != null) stats.push({ icon: <Icon d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" className="h-4 w-4" />, label: 'Distance', value: formatDistance(activity.distanceKm) })
  if (activity.paceMinPerKm != null) stats.push({ icon: <Icon d="M13 10V3L4 14h7v7l9-11h-7z" className="h-4 w-4" />, label: 'Avg Pace', value: formatPace(activity.paceMinPerKm) })
  if (activity.speedKmH != null) stats.push({ icon: <Icon d="M13 10V3L4 14h7v7l9-11h-7z" className="h-4 w-4" />, label: 'Avg Speed', value: `${activity.speedKmH.toFixed(1)} km/h` })
  if (activity.caloriesBurned != null) stats.push({ icon: <Icon d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" className="h-4 w-4" />, label: 'Calories', value: `${activity.caloriesBurned.toLocaleString()} kcal` })
  if (activity.elevationGainM != null) stats.push({ icon: <Icon d="M5 3l14 9-14 9V3z" className="h-4 w-4" />, label: 'Elevation', value: `↑${activity.elevationGainM.toFixed(0)}m` })

  // Biometric stats
  const bioStats: Array<{ emoji: string; label: string; value: string }> = []
  if (activity.heartRateAvg != null) bioStats.push({ emoji: '❤️', label: 'Avg HR', value: `${activity.heartRateAvg} bpm` })
  if (activity.heartRateMax != null) bioStats.push({ emoji: '💓', label: 'Max HR', value: `${activity.heartRateMax} bpm` })
  if (activity.cadence != null) bioStats.push({ emoji: '🔄', label: 'Cadence', value: `${activity.cadence} rpm` })
  if (activity.powerWatts != null) bioStats.push({ emoji: '⚡', label: 'Power', value: `${activity.powerWatts} W` })
  if (activity.temperature != null) bioStats.push({ emoji: '🌡️', label: 'Temp', value: `${activity.temperature}°C` })

  // Tag teammate server action
  async function tagTeammate(formData: FormData) {
    'use server'
    const user = await getCurrentUser()
    if (!user || user.id !== activity?.userId) return
    const raw = (formData.get('nickname') as string)?.trim().replace(/^@/, '').toLowerCase()
    if (!raw) return
    const target = await prisma.user.findUnique({ where: { nickname: raw }, select: { id: true, name: true } })
    if (!target || target.id === user.id) return
    try {
      await prisma.activityTag.create({ data: { activityId: activity!.id, taggerId: user.id, taggedId: target.id } })
      await prisma.notification.create({
        data: {
          userId: target.id,
          type: 'TEAMMATE_TAGGED',
          title: `${user.name} tagged you in an activity`,
          body: activity!.title,
          linkUrl: `/app/activities/${activity!.id}`,
        },
      })
      revalidatePath(`/app/activities/${activity!.id}`)
    } catch { /* duplicate tag — ignore */ }
  }

  // Add comment server action
  async function addComment(formData: FormData) {
    'use server'
    const user = await getCurrentUser()
    if (!user || !activity?.feedPost) return
    const content = (formData.get('content') as string)?.trim()
    if (!content || content.length > 500) return
    await prisma.feedComment.create({
      data: {
        postId: activity.feedPost.id,
        userId: user.id,
        content,
      },
    })
    await prisma.notification.create({
      data: {
        userId: activity.userId,
        type: 'COMMENT_RECEIVED',
        title: `${user.name} commented on your activity`,
        body: content.slice(0, 100),
        linkUrl: `/app/activities/${activity.id}`,
      },
    })
    revalidatePath(`/app/activities/${activity.id}`)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-6">

      {/* Back */}
      <div className="mb-5">
        <Link href="/app/activities" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to Activities
        </Link>
      </div>

      {/* Flagged warning */}
      {isFlagged && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-4">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <div>
            <p className="text-sm font-semibold text-red-400">This activity has been flagged for review</p>
            {activity.flagReason && <p className="mt-1 text-sm text-red-300/80">{activity.flagReason}</p>}
          </div>
        </div>
      )}

      {/* PR badges */}
      {activity.personalRecords.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {activity.personalRecords.map((pr) => (
            <span key={pr.id} className="flex items-center gap-1.5 rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-400">
              🏆 {PR_LABELS[pr.type] ?? pr.type} PR!
            </span>
          ))}
        </div>
      )}

      {/* Header card */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={activityTypeBadgeVariant(activity.type)} className="flex items-center gap-1.5">
            <span>{activityTypeIcon(activity.type)}</span>
            <span>{activityTypeLabel(activity.type)}</span>
          </Badge>
          {statusBadge(activity.status)}
          {activity.effortLevel != null && (
            <span className="ml-auto rounded-full border border-slate-600 bg-slate-700 px-2.5 py-0.5 text-xs text-slate-300">
              Effort {activity.effortLevel}/10
            </span>
          )}
        </div>

        <h1 className="mt-3 text-2xl font-bold leading-tight text-white">{activity.title}</h1>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
          <span>{formatDateTime(activity.startedAt)}</span>
          <span>by <span className="text-slate-300">{activity.user.name}</span></span>
          {activity.gear && <span>🏷️ {activity.gear}</span>}
        </div>

        {activity.description && (
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{activity.description}</p>
        )}

        <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
          {kudosCount > 0 && <span>❤️ {kudosCount} kudos</span>}
          {comments.length > 0 && <span>💬 {comments.length} comments</span>}
        </div>

        {isOwner && (
          <div className="mt-4 border-t border-slate-700 pt-4">
            <Link href={`/app/activities/${activity.id}/edit`} className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 hover:text-white transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit
            </Link>
          </div>
        )}
      </div>

      {/* Photo gallery */}
      {activity.media.length > 0 && (
        <div className="mt-4">
          <div className={cn(
            'grid gap-2 overflow-hidden rounded-2xl',
            activity.media.length === 1 ? 'grid-cols-1' :
            activity.media.length === 2 ? 'grid-cols-2' :
            'grid-cols-2 sm:grid-cols-3',
          )}>
            {activity.media.map((m, i) => (
              <div key={m.id} className={cn('relative overflow-hidden', activity.media.length === 1 ? 'aspect-video' : 'aspect-square', i === 0 && activity.media.length >= 3 ? 'col-span-2 aspect-video sm:col-span-1 sm:aspect-square' : '')}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className={cn('mt-4 grid gap-3', stats.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3')}>
        {stats.map((stat) => <StatItem key={stat.label} {...stat} />)}
      </div>

      {/* Biometric stats */}
      {bioStats.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Biometrics</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            {bioStats.map((b) => (
              <div key={b.label}>
                <p className="text-xs text-slate-500">{b.emoji} {b.label}</p>
                <p className="mt-0.5 text-sm font-bold text-white">{b.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Points */}
      <div className="mt-4 flex items-center gap-4 rounded-xl border border-yellow-600/30 bg-yellow-600/5 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-600/20">
          <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Points Awarded</p>
          <p className="text-2xl font-bold text-yellow-400">{activity.pointsEarned > 0 ? `+${activity.pointsEarned.toLocaleString()} pts` : '0 pts'}</p>
        </div>
        {activity.pointsEarned === 0 && activity.status === ActivityStatus.PENDING && (
          <p className="ml-auto text-xs text-slate-500 text-right max-w-[140px]">Points awarded after review</p>
        )}
      </div>

      {/* Route map */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
        <div className="flex items-center gap-2.5 border-b border-slate-700 px-5 py-3">
          <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span className="text-sm font-semibold text-slate-200">Route Map</span>
          {hasRoute && (
            <span className="ml-auto rounded-full border border-slate-600 bg-slate-700 px-2.5 py-0.5 text-xs text-slate-300">
              {routePointCount.toLocaleString()} GPS points
            </span>
          )}
        </div>
        <div className="h-64">
          <ActivityMap points={mapPoints} />
        </div>
      </div>

      {/* Splits */}
      {activity.splits.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Splits</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-700">
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">km</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-slate-400">Time</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-slate-400">Pace</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-slate-400 hidden sm:table-cell">Elev</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-700/50">
                {activity.splits.map((split) => {
                  const avg = activity.paceMinPerKm ?? 0
                  const fast = split.paceSecPerKm < avg * 60 * 0.95
                  const slow = split.paceSecPerKm > avg * 60 * 1.05
                  return (
                    <tr key={split.splitNumber} className="hover:bg-white/5">
                      <td className="px-4 py-2.5 text-slate-400 font-medium">{split.splitNumber}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-300">{formatSplitTime(split.elapsedSecs)}</td>
                      <td className={cn('px-4 py-2.5 text-right font-mono text-sm', fast ? 'text-green-400' : slow ? 'text-orange-400' : 'text-slate-300')}>{formatPaceSec(split.paceSecPerKm)}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-slate-500 hidden sm:table-cell">{split.elevationGainM != null ? `↑${split.elevationGainM.toFixed(0)}m` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Segment efforts */}
      {activity.segmentEfforts.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Segments</h2>
          <div className="space-y-2">
            {activity.segmentEfforts.map((effort) => (
              <Link key={effort.id} href={`/app/segments/${effort.segment.id}`} className="flex items-center gap-4 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 transition-colors hover:bg-slate-700">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-100">{effort.segment.title}</p>
                  <p className="text-xs text-slate-500">{formatDistance(effort.segment.distanceKm)}{effort.segment.difficulty ? ` · ${effort.segment.difficulty}` : ''}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono font-semibold text-white">{formatSplitTime(effort.elapsedSecs)}</p>
                  {effort.rank && <p className="text-xs text-yellow-400">Rank #{effort.rank}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Comments */}
      {activity.feedPost && (
        <section className="mt-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Comments {comments.length > 0 && `(${comments.length})`}
          </h2>

          {comments.length === 0 && (
            <p className="mb-3 text-sm text-slate-500">No comments yet. Be the first!</p>
          )}

          <div className="space-y-3 mb-4">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <Avatar name={c.user.name} avatarUrl={c.user.avatarUrl} size={8} />
                <div className="flex-1 min-w-0">
                  <div className="rounded-2xl rounded-tl-sm border border-slate-700 bg-slate-800 px-3 py-2">
                    <p className="text-xs font-semibold text-slate-300">{c.user.name}</p>
                    <p className="mt-0.5 text-sm text-slate-200">{c.content}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</p>
                </div>
              </div>
            ))}
          </div>

          <form action={addComment} className="flex items-end gap-2">
            <textarea
              name="content"
              rows={2}
              maxLength={500}
              placeholder="Write a comment…"
              required
              className="flex-1 resize-none rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            <button type="submit" className="shrink-0 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 transition-colors">
              Post
            </button>
          </form>
        </section>
      )}

      {/* Tagged teammates */}
      {(activity.tags.length > 0 || isOwner) && (
        <section className="mt-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Tagged in this activity {activity.tags.length > 0 && `(${activity.tags.length})`}
          </h2>

          {activity.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {activity.tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/app/players/${tag.tagged.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:border-green-600/40 hover:text-green-400 transition-colors"
                >
                  <span className="text-base">👤</span>
                  <span className="font-medium">{tag.tagged.name}</span>
                  <span className="text-xs text-slate-500">@{tag.tagged.nickname}</span>
                </Link>
              ))}
            </div>
          )}

          {isOwner && (
            <form action={tagTeammate} className="flex items-center gap-2">
              <input
                name="nickname"
                type="text"
                placeholder="@nickname"
                maxLength={40}
                required
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              <button type="submit" className="shrink-0 rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-600 hover:text-white transition-colors">
                Tag
              </button>
            </form>
          )}
        </section>
      )}

      {/* Footer meta */}
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600">
        <span>Logged {formatDate(activity.createdAt, 'MMM d, yyyy')}</span>
        <span className="capitalize">Visibility: {activity.visibility.toLowerCase()}</span>
      </div>

    </div>
  )
}
