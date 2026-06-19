'use server'

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { cn, formatDate, formatDateTime, formatDuration, formatDistance, activityTypeLabel, activityTypeIcon, rewardCategoryLabel, getLevelColor } from '@/lib/utils'
import {
  ActivityStatus,
  PointsSourceType,
  RedemptionStatus,
  Role,
} from '@/generated/prisma'

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getPlayer(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      nickname: true,
      phone: true,
      dateOfBirth: true,
      role: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      centerId: true,
      center: {
        select: { id: true, name: true, city: true },
      },
      playerProfile: {
        select: {
          totalPoints: true,
          lifetimePoints: true,
          level: true,
          totalDistance: true,
          totalMinutes: true,
          totalActivities: true,
          streakDays: true,
          lastActivityAt: true,
          favoriteSport: true,
          bio: true,
        },
      },
      activities: {
        orderBy: { startedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          title: true,
          type: true,
          startedAt: true,
          durationMinutes: true,
          distanceKm: true,
          status: true,
          pointsEarned: true,
          flagReason: true,
        },
      },
      userBadges: {
        orderBy: { awardedAt: 'desc' },
        select: {
          id: true,
          awardedAt: true,
          badge: {
            select: { id: true, name: true, description: true, iconUrl: true, key: true },
          },
        },
      },
      pointsLedger: {
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          sourceType: true,
          points: true,
          reason: true,
          createdAt: true,
        },
      },
      rewardRedemptions: {
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true,
          pointsSpent: true,
          redemptionCode: true,
          status: true,
          usedAt: true,
          createdAt: true,
          reward: {
            select: { id: true, title: true, category: true, pointsCost: true },
          },
        },
      },
      challengeParticipants: {
        orderBy: { joinedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          progress: true,
          isCompleted: true,
          completedAt: true,
          joinedAt: true,
          challenge: {
            select: { id: true, title: true, type: true, targetValue: true, endDate: true, pointsReward: true },
          },
        },
      },
      _count: {
        select: {
          followers: true,
          following: true,
          feedPosts: true,
        },
      },
    },
  })
}

type Player = NonNullable<Awaited<ReturnType<typeof getPlayer>>>

// ─── Server Actions ───────────────────────────────────────────────────────────

async function awardBonusPoints(formData: FormData) {
  'use server'
  const admin = await getCurrentUser()
  if (!admin || (admin.role !== 'PLATFORM_ADMIN' && admin.role !== 'CENTER_ADMIN')) {
    redirect('/unauthorized')
  }

  const playerId = formData.get('playerId') as string
  const amountStr = formData.get('amount') as string
  const reason = (formData.get('reason') as string)?.trim()

  const amount = parseInt(amountStr, 10)
  if (!playerId || !reason || isNaN(amount) || amount === 0) return

  await prisma.$transaction(async (tx) => {
    await tx.pointsLedger.create({
      data: {
        userId: playerId,
        sourceType: PointsSourceType.ADMIN_BONUS,
        points: amount,
        reason,
      },
    })

    await tx.playerProfile.updateMany({
      where: { userId: playerId },
      data: {
        totalPoints: { increment: amount },
        lifetimePoints: amount > 0 ? { increment: amount } : undefined,
      },
    })

    await tx.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: 'AWARD_BONUS_POINTS',
        entityType: 'User',
        entityId: playerId,
        details: JSON.stringify({ amount, reason }),
      },
    })
  })

  revalidatePath(`/admin/players/${playerId}`)
}

async function toggleBanPlayer(formData: FormData) {
  'use server'
  const admin = await getCurrentUser()
  if (!admin || (admin.role !== 'PLATFORM_ADMIN' && admin.role !== 'CENTER_ADMIN')) {
    redirect('/unauthorized')
  }

  const playerId = formData.get('playerId') as string
  const currentActive = formData.get('currentActive') === 'true'

  if (!playerId) return

  const newActive = !currentActive

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: playerId },
      data: { isActive: newActive },
    })

    await tx.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: newActive ? 'UNBAN_PLAYER' : 'BAN_PLAYER',
        entityType: 'User',
        entityId: playerId,
        details: JSON.stringify({ previousActive: currentActive, newActive }),
      },
    })
  })

  revalidatePath(`/admin/players/${playerId}`)
}

async function changePlayerRole(formData: FormData) {
  'use server'
  const admin = await getCurrentUser()
  if (!admin || admin.role !== 'PLATFORM_ADMIN') {
    redirect('/unauthorized')
  }

  const playerId = formData.get('playerId') as string
  const newRole = formData.get('newRole') as Role
  const previousRole = formData.get('previousRole') as Role

  if (!playerId || !newRole) return

  const validRoles: Role[] = ['PLAYER', 'CENTER_ADMIN', 'PLATFORM_ADMIN', 'SPONSOR_ADMIN']
  if (!validRoles.includes(newRole)) return

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: playerId },
      data: { role: newRole },
    })

    await tx.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: 'CHANGE_ROLE',
        entityType: 'User',
        entityId: playerId,
        details: JSON.stringify({ previousRole, newRole }),
      },
    })
  })

  revalidatePath(`/admin/players/${playerId}`)
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const player = await getPlayer(id)
  if (!player) return { title: 'Player Not Found' }
  return { title: `Player: ${player.name} — Admin` }
}

// ─── SVG Icon helpers ─────────────────────────────────────────────────────────

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
      {children}
    </h2>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

function ActivityStatusPill({ status }: { status: ActivityStatus }) {
  const map: Record<ActivityStatus, { label: string; cls: string }> = {
    APPROVED: { label: 'Approved', cls: 'bg-green-600/15 text-green-400 border-green-600/30' },
    PENDING: { label: 'Pending', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    FLAGGED: { label: 'Flagged', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
    REJECTED: { label: 'Rejected', cls: 'bg-slate-700/50 text-slate-400 border-slate-600' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-slate-700/50 text-slate-400 border-slate-600' }
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', cls)}>
      {label}
    </span>
  )
}

function RedemptionStatusPill({ status }: { status: RedemptionStatus }) {
  const map: Record<RedemptionStatus, { label: string; cls: string }> = {
    PENDING: { label: 'Pending', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    USED: { label: 'Used', cls: 'bg-green-600/15 text-green-400 border-green-600/30' },
    CANCELLED: { label: 'Cancelled', cls: 'bg-slate-700/50 text-slate-400 border-slate-600' },
    EXPIRED: { label: 'Expired', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-slate-700/50 text-slate-400 border-slate-600' }
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', cls)}>
      {label}
    </span>
  )
}

function PointsPill({ points }: { points: number }) {
  if (points > 0) {
    return (
      <span className="font-semibold text-green-400">+{points.toLocaleString()}</span>
    )
  }
  return (
    <span className="font-semibold text-red-400">{points.toLocaleString()}</span>
  )
}

function sourceTypeLabel(type: PointsSourceType): string {
  const labels: Record<PointsSourceType, string> = {
    ACTIVITY: 'Activity',
    CHALLENGE_COMPLETION: 'Challenge',
    EVENT_ATTENDANCE: 'Event',
    BADGE_AWARD: 'Badge',
    ADMIN_BONUS: 'Admin Bonus',
    REDEMPTION_DEBIT: 'Redemption',
    REFERRAL: 'Referral',
    CUSTOM: 'Custom',
    VENUE_CHECK_IN: 'Venue Check-in',
    SESSION_ATTENDANCE: 'Session Attendance',
  }
  return labels[type] ?? type
}

function RolePill({ role }: { role: Role }) {
  const map: Record<Role, { label: string; cls: string }> = {
    PLAYER: { label: 'Player', cls: 'bg-slate-700/50 text-slate-300 border-slate-600' },
    CENTER_ADMIN: { label: 'Center Admin', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    PLATFORM_ADMIN: { label: 'Platform Admin', cls: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
    SPONSOR_ADMIN: { label: 'Sponsor Admin', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    OWNER: { label: 'Owner', cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  }
  const { label, cls } = map[role]
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', cls)}>
      {label}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminPlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [player, admin] = await Promise.all([
    getPlayer(id),
    getCurrentUser(),
  ])

  if (!player) notFound()
  if (!admin || (admin.role !== 'PLATFORM_ADMIN' && admin.role !== 'CENTER_ADMIN')) {
    redirect('/unauthorized')
  }

  const isPlatformAdmin = admin.role === 'PLATFORM_ADMIN'
  const profile = player.playerProfile
  const totalActivities = player.activities.length
  const approvedActivities = player.activities.filter(a => a.status === ActivityStatus.APPROVED).length
  const totalPointsEarned = player.pointsLedger
    .filter(e => e.points > 0)
    .reduce((s, e) => s + e.points, 0)
  const totalPointsSpent = player.pointsLedger
    .filter(e => e.points < 0)
    .reduce((s, e) => s + Math.abs(e.points), 0)

  return (
    <div className="space-y-8 pb-16">

      {/* ── Back nav ── */}
      <div>
        <Link
          href="/admin/players"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-200"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Back to Players
        </Link>
      </div>

      {/* ── Profile summary card ── */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="shrink-0">
            {player.avatarUrl ? (
              <img
                src={player.avatarUrl}
                alt={player.name}
                className="h-20 w-20 rounded-full object-cover ring-2 ring-slate-600"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-700 ring-2 ring-slate-600">
                <UserIcon className="h-10 w-10 text-slate-500" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-white">{player.name}</h1>
              <RolePill role={player.role} />
              {!player.isActive && (
                <span className="inline-flex items-center rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-400">
                  Banned
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-slate-400">
              @{player.nickname}
              {player.center && (
                <span className="ml-3 text-slate-500">
                  {player.center.name}{player.center.city ? `, ${player.center.city}` : ''}
                </span>
              )}
            </p>

            {profile?.bio && (
              <p className="mt-2 text-sm text-slate-300 leading-relaxed max-w-xl">{profile.bio}</p>
            )}

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
              <span>
                Email: <span className="text-slate-300">{player.email}</span>
              </span>
              {player.phone && (
                <span>
                  Phone: <span className="text-slate-300">{player.phone}</span>
                </span>
              )}
              {player.dateOfBirth && (
                <span>
                  DOB: <span className="text-slate-300">{formatDate(player.dateOfBirth)}</span>
                </span>
              )}
              <span>
                Joined: <span className="text-slate-300">{formatDate(player.createdAt)}</span>
              </span>
              <span>
                ID: <span className="font-mono text-slate-600">{player.id}</span>
              </span>
            </div>

            {profile && (
              <div className="mt-3 flex items-center gap-2">
                <span className={cn('text-sm font-semibold', getLevelColor(profile.level))}>
                  {profile.level}
                </span>
                <span className="text-slate-600">·</span>
                <span className="flex items-center gap-1 text-sm text-yellow-400 font-semibold">
                  <StarIcon className="h-3.5 w-3.5" />
                  {profile.totalPoints.toLocaleString()} pts
                </span>
                {profile.favoriteSport && (
                  <>
                    <span className="text-slate-600">·</span>
                    <span className="text-sm text-slate-400">{profile.favoriteSport}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Social counts */}
          <div className="flex shrink-0 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-white">{player._count.followers}</p>
              <p className="text-xs text-slate-500">Followers</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white">{player._count.following}</p>
              <p className="text-xs text-slate-500">Following</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white">{player._count.feedPosts}</p>
              <p className="text-xs text-slate-500">Posts</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div>
        <SectionHeading>Stats</SectionHeading>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          <StatCard label="Total Points" value={(profile?.totalPoints ?? 0).toLocaleString()} />
          <StatCard label="Lifetime Points" value={(profile?.lifetimePoints ?? 0).toLocaleString()} />
          <StatCard label="Activities" value={(profile?.totalActivities ?? totalActivities).toLocaleString()} sub={`${approvedActivities} approved`} />
          <StatCard label="Total Distance" value={`${(profile?.totalDistance ?? 0).toFixed(1)} km`} />
          <StatCard label="Active Time" value={formatDuration(profile?.totalMinutes ?? 0)} />
          <StatCard label="Streak" value={`${profile?.streakDays ?? 0} days`} sub={profile?.lastActivityAt ? `Last: ${formatDate(profile.lastActivityAt)}` : 'No activities yet'} />
          <StatCard label="Badges" value={player.userBadges.length} />
          <StatCard label="Challenges" value={player.challengeParticipants.length} sub={`${player.challengeParticipants.filter(c => c.isCompleted).length} completed`} />
          <StatCard label="Redemptions" value={player.rewardRedemptions.length} />
          <StatCard label="Points Earned" value={`+${totalPointsEarned.toLocaleString()}`} />
          <StatCard label="Points Spent" value={`-${totalPointsSpent.toLocaleString()}`} />
        </div>
      </div>

      {/* ── Activity history ── */}
      <div>
        <SectionHeading>Activity History</SectionHeading>
        {player.activities.length === 0 ? (
          <p className="rounded-xl border border-slate-700 bg-slate-800/40 px-5 py-6 text-sm text-slate-500">
            No activities recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-700 bg-slate-800/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Activity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Duration</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Distance</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Points</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 bg-slate-900/40">
                {player.activities.map((activity) => (
                  <tr key={activity.id} className="transition-colors hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/activities/${activity.id}`}
                        className="font-medium text-slate-200 hover:text-green-400 transition-colors"
                      >
                        {activity.title}
                      </Link>
                      {activity.flagReason && (
                        <p className="mt-0.5 text-xs text-red-400 truncate max-w-xs">{activity.flagReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <span>{activityTypeIcon(activity.type)}</span>
                        <span>{activityTypeLabel(activity.type)}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {formatDate(activity.startedAt)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300 whitespace-nowrap">
                      {formatDuration(activity.durationMinutes)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300 whitespace-nowrap">
                      {activity.distanceKm != null ? formatDistance(activity.distanceKm) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={activity.pointsEarned > 0 ? 'font-semibold text-yellow-400' : 'text-slate-500'}>
                        {activity.pointsEarned > 0 ? `+${activity.pointsEarned}` : '0'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ActivityStatusPill status={activity.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Badges grid ── */}
      <div>
        <SectionHeading>Badges ({player.userBadges.length})</SectionHeading>
        {player.userBadges.length === 0 ? (
          <p className="rounded-xl border border-slate-700 bg-slate-800/40 px-5 py-6 text-sm text-slate-500">
            No badges earned yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {player.userBadges.map((ub) => (
              <div
                key={ub.id}
                className="flex flex-col items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-4 text-center"
              >
                {ub.badge.iconUrl ? (
                  <img src={ub.badge.iconUrl} alt={ub.badge.name} className="h-12 w-12 object-contain" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-600/20">
                    <ShieldIcon className="h-6 w-6 text-yellow-400" />
                  </div>
                )}
                <p className="text-xs font-semibold text-slate-200 leading-tight">{ub.badge.name}</p>
                <p className="text-xs text-slate-500 leading-snug line-clamp-2">{ub.badge.description}</p>
                <p className="text-xs text-slate-600">{formatDate(ub.awardedAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Points ledger ── */}
      <div>
        <SectionHeading>Points Ledger (last 100)</SectionHeading>
        {player.pointsLedger.length === 0 ? (
          <p className="rounded-xl border border-slate-700 bg-slate-800/40 px-5 py-6 text-sm text-slate-500">
            No points transactions yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-700 bg-slate-800/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Reason</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 bg-slate-900/40">
                {player.pointsLedger.map((entry) => (
                  <tr key={entry.id} className="transition-colors hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {formatDateTime(entry.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                        entry.sourceType === PointsSourceType.ADMIN_BONUS
                          ? 'border-purple-500/30 bg-purple-500/10 text-purple-400'
                          : entry.sourceType === PointsSourceType.REDEMPTION_DEBIT
                            ? 'border-red-500/30 bg-red-500/10 text-red-400'
                            : 'border-slate-600 bg-slate-700/50 text-slate-400'
                      )}>
                        {sourceTypeLabel(entry.sourceType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 max-w-xs truncate">
                      {entry.reason}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <PointsPill points={entry.points} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Redemptions ── */}
      <div>
        <SectionHeading>Reward Redemptions</SectionHeading>
        {player.rewardRedemptions.length === 0 ? (
          <p className="rounded-xl border border-slate-700 bg-slate-800/40 px-5 py-6 text-sm text-slate-500">
            No redemptions yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-700 bg-slate-800/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Reward</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Points Spent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Code</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Redeemed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 bg-slate-900/40">
                {player.rewardRedemptions.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-medium text-slate-200">{r.reward.title}</td>
                    <td className="px-4 py-3 text-slate-400">{rewardCategoryLabel(r.reward.category)}</td>
                    <td className="px-4 py-3 text-right text-red-400 font-semibold">
                      -{r.pointsSpent.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-slate-700/60 px-1.5 py-0.5 text-xs font-mono text-slate-300">
                        {r.redemptionCode.slice(0, 12)}…
                      </code>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <RedemptionStatusPill status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {formatDate(r.createdAt)}
                      {r.usedAt && (
                        <span className="ml-2 text-xs text-slate-500">used {formatDate(r.usedAt)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Challenge participations ── */}
      <div>
        <SectionHeading>Challenge Participations</SectionHeading>
        {player.challengeParticipants.length === 0 ? (
          <p className="rounded-xl border border-slate-700 bg-slate-800/40 px-5 py-6 text-sm text-slate-500">
            No challenge participation yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-700 bg-slate-800/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Challenge</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Progress</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Completed</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Reward</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Joined</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Ends</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 bg-slate-900/40">
                {player.challengeParticipants.map((cp) => {
                  const pct = Math.min(100, (cp.progress / cp.challenge.targetValue) * 100)
                  return (
                    <tr key={cp.id} className="transition-colors hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-medium text-slate-200">{cp.challenge.title}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-700">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                cp.isCompleted ? 'bg-green-500' : 'bg-yellow-500'
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-xs text-slate-400">{Math.round(pct)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {cp.isCompleted ? (
                          <span className="inline-flex items-center rounded-full border border-green-600/30 bg-green-600/10 px-2.5 py-0.5 text-xs font-semibold text-green-400">
                            Done
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-yellow-400 font-semibold">
                        +{cp.challenge.pointsReward}
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {formatDate(cp.joinedAt)}
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {formatDate(cp.challenge.endDate)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Admin Actions ─────────────────────────────────────────────────────── */}
      <div>
        <SectionHeading>Admin Actions</SectionHeading>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

          {/* Award bonus points */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-200">Award Bonus Points</h3>
            <form action={awardBonusPoints} className="space-y-3">
              <input type="hidden" name="playerId" value={player.id} />
              <div>
                <label htmlFor="bonus-amount" className="mb-1 block text-xs font-medium text-slate-400">
                  Amount (use negative to deduct)
                </label>
                <input
                  id="bonus-amount"
                  type="number"
                  name="amount"
                  required
                  placeholder="e.g. 100 or -50"
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
                />
              </div>
              <div>
                <label htmlFor="bonus-reason" className="mb-1 block text-xs font-medium text-slate-400">
                  Reason
                </label>
                <input
                  id="bonus-reason"
                  type="text"
                  name="reason"
                  required
                  maxLength={200}
                  placeholder="e.g. Event participation bonus"
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                Award Points
              </button>
            </form>
          </div>

          {/* Ban / unban */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5">
            <h3 className="mb-1 text-sm font-semibold text-slate-200">
              {player.isActive ? 'Ban Player' : 'Unban Player'}
            </h3>
            <p className="mb-4 text-xs text-slate-500 leading-relaxed">
              {player.isActive
                ? 'Banning will prevent the player from logging in. All data is preserved.'
                : 'Unbanning will restore the player\'s access to the platform.'}
            </p>
            <form action={toggleBanPlayer}>
              <input type="hidden" name="playerId" value={player.id} />
              <input type="hidden" name="currentActive" value={String(player.isActive)} />
              <button
                type="submit"
                className={cn(
                  'w-full rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2',
                  player.isActive
                    ? 'border border-red-700/50 bg-red-700/10 text-red-400 hover:bg-red-700/20 hover:text-red-300 focus-visible:ring-red-600'
                    : 'border border-green-600/50 bg-green-600/10 text-green-400 hover:bg-green-600/20 hover:text-green-300 focus-visible:ring-green-600'
                )}
              >
                {player.isActive ? 'Ban Player' : 'Unban Player'}
              </button>
            </form>
          </div>

          {/* Change role — platform admin only */}
          {isPlatformAdmin && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-200">Change Role</h3>
              <form action={changePlayerRole} className="space-y-3">
                <input type="hidden" name="playerId" value={player.id} />
                <input type="hidden" name="previousRole" value={player.role} />
                <div>
                  <label htmlFor="new-role" className="mb-1 block text-xs font-medium text-slate-400">
                    New Role
                  </label>
                  <select
                    id="new-role"
                    name="newRole"
                    defaultValue={player.role}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
                  >
                    <option value="PLAYER">Player</option>
                    <option value="CENTER_ADMIN">Center Admin</option>
                    <option value="PLATFORM_ADMIN">Platform Admin</option>
                    <option value="SPONSOR_ADMIN">Sponsor Admin</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg border border-blue-600/50 bg-blue-600/10 px-4 py-2 text-sm font-semibold text-blue-400 transition-colors hover:bg-blue-600/20 hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Update Role
                </button>
              </form>
            </div>
          )}

        </div>
      </div>

    </div>
  )
}
