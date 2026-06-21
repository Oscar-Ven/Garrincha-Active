import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { cn, activityTypeLabel, formatDate, formatDateTime, formatDuration, formatDistance, formatPace } from '@/lib/utils'
import { ActivityStatus, ActivityType } from '@/generated/prisma'
import { HRZonesDisplay } from '@/components/ui/hr-zones-display'
import { ShareActivityButton } from './ShareActivityButton'
import { formatDistanceToNow } from 'date-fns'
import { ActivityMap } from '@/components/maps/ActivityMap'
import { KudosButton } from './KudosButton'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function activitySymbol(type: ActivityType): string {
  const map: Partial<Record<ActivityType, string>> = {
    PADEL: 'sports_tennis', TENNIS: 'sports_tennis', PICKLEBALL: 'sports_tennis',
    SQUASH: 'sports_handball', RACQUETBALL: 'sports_handball',
    BADMINTON: 'sports_badminton',
    RUN: 'directions_run', WALK: 'directions_walk',
    CYCLING: 'directions_bike',
    FOOTBALL_TRAINING: 'sports_soccer', FOOTBALL_MATCH: 'sports_soccer',
    FITNESS: 'fitness_center', CUSTOM: 'sports',
  }
  return map[type] ?? 'sports'
}

function activityTypeBadgeClass(type: ActivityType): string {
  switch (type) {
    case ActivityType.FOOTBALL_MATCH:
    case ActivityType.FOOTBALL_TRAINING:
      return 'border-primary-fixed/40 bg-primary-fixed/10 text-primary-fixed'
    case ActivityType.RUN:
    case ActivityType.CYCLING:
      return 'border-secondary/40 bg-secondary/10 text-secondary'
    case ActivityType.FITNESS:
      return 'border-[#FFD700]/40 bg-[#FFD700]/10 text-[#FFD700]'
    default:
      return 'glass-card text-on-surface-variant'
  }
}

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

function statusBadge(status: ActivityStatus) {
  switch (status) {
    case ActivityStatus.APPROVED:
      return <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-fixed/40 bg-primary-fixed/10 px-3 py-1 text-xs font-semibold text-primary-fixed"><span className="h-1.5 w-1.5 rounded-full bg-primary-fixed" />Approved</span>
    case ActivityStatus.PENDING:
      return <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />Pending Review</span>
    case ActivityStatus.FLAGGED:
      return <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-400" />Flagged</span>
    case ActivityStatus.REJECTED:
      return <span className="inline-flex items-center gap-1.5 rounded-full glass-card border px-3 py-1 text-xs font-semibold text-on-surface-variant"><span className="h-1.5 w-1.5 rounded-full bg-on-surface-variant/60" />Rejected</span>
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
    <div className="glass-card flex flex-col gap-1.5 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 text-on-surface-variant">{icon}<span className="text-xs font-medium uppercase tracking-wide">{label}</span></div>
      <p className="text-lg font-bold text-on-surface">{value}</p>
      {subValue && <p className="text-xs text-on-surface-variant">{subValue}</p>}
    </div>
  )
}

function Avatar({ name, avatarUrl, size = 8 }: { name: string; avatarUrl: string | null; size?: number }) {
  const s = `h-${size} w-${size}`
  if (avatarUrl) return <img src={avatarUrl} alt={name} className={`${s} rounded-full object-cover`} />
  return <div className={`${s} flex shrink-0 items-center justify-center rounded-full bg-surface-container text-xs font-bold text-on-surface`}>{name[0]}</div>
}

function MSym({ name, size = 16, fill = 0 }: { name: string; size?: number; fill?: 0 | 1 }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{ fontSize: `${size}px`, fontVariationSettings: `'FILL' ${fill}` }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
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

  let userHasKudos = false
  if (currentUser && activity.feedPost?.id) {
    const reaction = await prisma.feedReaction.findFirst({
      where: { postId: activity.feedPost.id, userId: currentUser.id },
      select: { id: true },
    })
    userHasKudos = reaction !== null
  }

  const stats: Array<{ icon: React.ReactNode; label: string; value: string; subValue?: string }> = [
    { icon: <MSym name="timer" />, label: 'Duration', value: formatDuration(activity.durationMinutes) },
  ]
  if (activity.distanceKm != null) stats.push({ icon: <MSym name="straighten" />, label: 'Distance', value: formatDistance(activity.distanceKm) })
  if (activity.paceMinPerKm != null) stats.push({ icon: <MSym name="bolt" fill={1} />, label: 'Avg Pace', value: formatPace(activity.paceMinPerKm) })
  if (activity.speedKmH != null) stats.push({ icon: <MSym name="bolt" fill={1} />, label: 'Avg Speed', value: `${activity.speedKmH.toFixed(1)} km/h` })
  if (activity.caloriesBurned != null) stats.push({ icon: <MSym name="local_fire_department" fill={1} />, label: 'Calories', value: `${activity.caloriesBurned.toLocaleString()} kcal` })
  if (activity.elevationGainM != null) stats.push({ icon: <MSym name="trending_up" />, label: 'Elevation', value: `↑${activity.elevationGainM.toFixed(0)}m` })

  const bioStats: Array<{ icon: string; label: string; value: string }> = []
  if (activity.heartRateAvg != null) bioStats.push({ icon: 'favorite', label: 'Avg HR', value: `${activity.heartRateAvg} bpm` })
  if (activity.heartRateMax != null) bioStats.push({ icon: 'favorite', label: 'Max HR', value: `${activity.heartRateMax} bpm` })
  if (activity.cadence != null) bioStats.push({ icon: 'refresh', label: 'Cadence', value: `${activity.cadence} rpm` })
  if (activity.powerWatts != null) bioStats.push({ icon: 'bolt', label: 'Power', value: `${activity.powerWatts} W` })
  if (activity.temperature != null) bioStats.push({ icon: 'thermostat', label: 'Temp', value: `${activity.temperature}°C` })

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

  async function addComment(formData: FormData) {
    'use server'
    const user = await getCurrentUser()
    if (!user || !activity?.feedPost) return
    const content = (formData.get('content') as string)?.trim()
    if (!content || content.length > 500) return
    await prisma.feedComment.create({
      data: { postId: activity.feedPost.id, userId: user.id, content },
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
        <Link href="/app/activities" className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
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
            <span key={pr.id} className="flex items-center gap-1.5 rounded-full border border-[#FFD700]/30 bg-[#FFD700]/10 px-3 py-1 text-xs font-semibold text-[#FFD700]">
              <span className="material-symbols-outlined" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
              {PR_LABELS[pr.type] ?? pr.type} PR!
            </span>
          ))}
        </div>
      )}

      {/* Header card */}
      <div className="glass-card rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold', activityTypeBadgeClass(activity.type))}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>{activitySymbol(activity.type)}</span>
            <span>{activityTypeLabel(activity.type)}</span>
          </span>
          {statusBadge(activity.status)}
          {activity.effortLevel != null && (
            <span className="ml-auto glass-card rounded-full border px-2.5 py-0.5 text-xs text-on-surface">
              Effort {activity.effortLevel}/10
            </span>
          )}
        </div>

        <h1 className="mt-3 text-2xl font-bold leading-tight text-on-surface">{activity.title}</h1>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-on-surface-variant">
          <span>{formatDateTime(activity.startedAt)}</span>
          <span>by <span className="text-on-surface">{activity.user.name}</span></span>
          {activity.gear && <span>🏷️ {activity.gear}</span>}
        </div>

        {activity.description && (
          <p className="mt-3 text-sm leading-relaxed text-on-surface">{activity.description}</p>
        )}

        {(activity.feedPost || comments.length > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {activity.feedPost && (
              <KudosButton
                postId={activity.feedPost.id}
                initialCount={kudosCount}
                initiallyLiked={userHasKudos}
                currentUserId={currentUser?.id}
              />
            )}
            {comments.length > 0 && (
              <span className="text-xs text-on-surface-variant">💬 {comments.length} comments</span>
            )}
          </div>
        )}

        {isOwner && (
          <div className="mt-4 border-t border-white/10 pt-4">
            <Link href={`/app/activities/${activity.id}/edit`} className="inline-flex items-center gap-2 glass-card rounded-lg border px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors">
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
        <div className="mt-4 glass-card rounded-xl px-4 py-3">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Biometrics</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            {bioStats.map((b) => (
              <div key={b.label}>
                <p className="flex items-center gap-1 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined" style={{ fontSize: '13px', fontVariationSettings: "'FILL' 1" }}>{b.icon}</span>
                  {b.label}
                </p>
                <p className="mt-0.5 text-sm font-bold text-on-surface">{b.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Points */}
      <div className="mt-4 flex items-center gap-4 rounded-xl border border-[#FFD700]/30 bg-[#FFD700]/5 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFD700]/20">
          <span className="material-symbols-outlined text-[#FFD700]" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>stars</span>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">Points Awarded</p>
          <p className="text-2xl font-bold text-[#FFD700]">{activity.pointsEarned > 0 ? `+${activity.pointsEarned.toLocaleString()} pts` : '0 pts'}</p>
        </div>
        {activity.pointsEarned === 0 && activity.status === ActivityStatus.PENDING && (
          <p className="ml-auto text-xs text-on-surface-variant text-right max-w-[140px]">Points awarded after review</p>
        )}
      </div>

      {/* Route map */}
      <div className="mt-4 glass-card overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-3">
          <span className="material-symbols-outlined text-primary-fixed" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>location_on</span>
          <span className="text-sm font-semibold text-on-surface">Route Map</span>
          {hasRoute && (
            <span className="ml-auto glass-card rounded-full border px-2.5 py-0.5 text-xs text-on-surface">
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
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Splits</h2>
          <div className="glass-card overflow-x-auto rounded-xl">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10">
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-on-surface-variant">km</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-on-surface-variant">Time</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-on-surface-variant">Pace</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-on-surface-variant hidden sm:table-cell">Elev</th>
              </tr></thead>
              <tbody className="divide-y divide-white/5">
                {activity.splits.map((split) => {
                  const avg = activity.paceMinPerKm ?? 0
                  const fast = split.paceSecPerKm < avg * 60 * 0.95
                  const slow = split.paceSecPerKm > avg * 60 * 1.05
                  return (
                    <tr key={split.splitNumber} className="hover:bg-white/5">
                      <td className="px-4 py-2.5 text-on-surface-variant font-medium">{split.splitNumber}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-on-surface">{formatSplitTime(split.elapsedSecs)}</td>
                      <td className={cn('px-4 py-2.5 text-right font-mono text-sm', fast ? 'text-primary-fixed' : slow ? 'text-[#FFD700]' : 'text-on-surface')}>{formatPaceSec(split.paceSecPerKm)}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-on-surface-variant hidden sm:table-cell">{split.elevationGainM != null ? `↑${split.elevationGainM.toFixed(0)}m` : '—'}</td>
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
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Segments</h2>
          <div className="space-y-2">
            {activity.segmentEfforts.map((effort) => (
              <Link key={effort.id} href={`/app/segments/${effort.segment.id}`} className="glass-card flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors hover:bg-surface-container-high">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-on-surface">{effort.segment.title}</p>
                  <p className="text-xs text-on-surface-variant">{formatDistance(effort.segment.distanceKm)}{effort.segment.difficulty ? ` · ${effort.segment.difficulty}` : ''}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono font-semibold text-on-surface">{formatSplitTime(effort.elapsedSecs)}</p>
                  {effort.rank && <p className="text-xs text-[#FFD700]">Rank #{effort.rank}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Comments */}
      {activity.feedPost && (
        <section className="mt-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            Comments {comments.length > 0 && `(${comments.length})`}
          </h2>

          {comments.length === 0 && (
            <p className="mb-3 text-sm text-on-surface-variant">No comments yet. Be the first!</p>
          )}

          <div className="space-y-3 mb-4">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <Avatar name={c.user.name} avatarUrl={c.user.avatarUrl} size={8} />
                <div className="flex-1 min-w-0">
                  <div className="glass-card rounded-2xl rounded-tl-sm border px-3 py-2">
                    <p className="text-xs font-semibold text-on-surface">{c.user.name}</p>
                    <p className="mt-0.5 text-sm text-on-surface">{c.content}</p>
                  </div>
                  <p className="mt-1 text-xs text-on-surface-variant">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</p>
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
              className="flex-1 resize-none glass-card rounded-xl border border-white/10 px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary-fixed"
            />
            <button type="submit" className="shrink-0 rounded-xl bg-primary-fixed px-4 py-2.5 text-sm font-semibold text-on-primary-fixed hover:bg-primary-fixed-dim transition-colors">
              Post
            </button>
          </form>
        </section>
      )}

      {/* Tagged teammates */}
      {(activity.tags.length > 0 || isOwner) && (
        <section className="mt-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            Tagged in this activity {activity.tags.length > 0 && `(${activity.tags.length})`}
          </h2>

          {activity.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {activity.tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/app/players/${tag.tagged.id}`}
                  className="glass-card inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm text-on-surface hover:border-primary-fixed/40 hover:text-primary-fixed transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>person</span>
                  <span className="font-medium">{tag.tagged.name}</span>
                  <span className="text-xs text-on-surface-variant">@{tag.tagged.nickname}</span>
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
                className="flex-1 glass-card rounded-xl border border-white/10 px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary-fixed"
              />
              <button type="submit" className="shrink-0 glass-card rounded-xl border px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-high transition-colors">
                Tag
              </button>
            </form>
          )}
        </section>
      )}

      {/* HR Zones */}
      {activity.heartRateAvg != null && (
        <div className="mt-6">
          <HRZonesDisplay heartRateAvg={activity.heartRateAvg} heartRateMax={activity.heartRateMax} />
        </div>
      )}

      {/* Share */}
      <div className="mt-6">
        <ShareActivityButton title={activity.title} />
      </div>

      {/* Footer meta */}
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-on-surface-variant">
        <span>Logged {formatDate(activity.createdAt, 'MMM d, yyyy')}</span>
        <span className="capitalize">Visibility: {activity.visibility.toLowerCase()}</span>
      </div>

    </div>
  )
}
