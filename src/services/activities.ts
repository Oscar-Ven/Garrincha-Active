import { prisma } from '@/lib/db'
import {
  Activity,
  ActivityType,
  ActivityVisibility,
  ActivityStatus,
  FeedPostType,
  DirectChallengeType,
  Prisma,
} from '@/generated/prisma'
import { awardActivityPoints } from '@/services/points'
import { calculateActivityPoints, isSpeedSuspicious, getLevelFromPoints } from '@/lib/points-rules'
import { checkBadgesForActivity } from '@/services/badges'
import { createFeedPost } from '@/services/feed'
import { syncActivityProgress } from '@/services/challenges'

async function syncSquadGoalProgress(
  userId: string,
  distanceKm: number | undefined,
  durationMinutes: number,
): Promise<void> {
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  })
  if (memberships.length === 0) return

  const now = new Date()
  const goals = await prisma.squadGoal.findMany({
    where: {
      teamId: { in: memberships.map((m) => m.teamId) },
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
  })

  const increments: Record<DirectChallengeType, number> = {
    DISTANCE: distanceKm ?? 0,
    ACTIVE_MINUTES: durationMinutes,
    ACTIVITY_COUNT: 1,
  }

  await Promise.all(
    goals
      .filter((g) => increments[g.type] > 0)
      .map((g) =>
        prisma.squadGoal.update({
          where: { id: g.id },
          data: { currentValue: { increment: increments[g.type] } },
        }),
      ),
  )
}

// kg CO₂ saved vs driving per km by activity type
const CARBON_KG_PER_KM: Partial<Record<ActivityType, number>> = {
  [ActivityType.RUN]: 0.21,
  [ActivityType.WALK]: 0.21,
  [ActivityType.CYCLING]: 0.21,
}

export type CreateActivityInput = {
  title: string
  type: ActivityType
  startedAt: Date
  durationMinutes: number
  distanceKm?: number
  description?: string
  visibility?: ActivityVisibility
  gear?: string
  effortLevel?: number
  heartRateAvg?: number
  heartRateMax?: number
  cadence?: number
  powerWatts?: number
  temperature?: number
  caloriesBurned?: number
}

export async function createActivity(
  userId: string,
  input: CreateActivityInput,
): Promise<Activity> {
  const {
    title, type, startedAt, durationMinutes, distanceKm, description, visibility,
    gear, effortLevel, heartRateAvg, heartRateMax, cadence, powerWatts, temperature,
    caloriesBurned,
  } = input

  // Calculate derived metrics
  let speedKmH: number | undefined
  let paceMinPerKm: number | undefined

  if (distanceKm !== undefined && distanceKm > 0 && durationMinutes > 0) {
    const hours = durationMinutes / 60
    speedKmH = distanceKm / hours
    paceMinPerKm = durationMinutes / distanceKm
  }

  // Determine status based on suspicious speed
  let status: ActivityStatus = ActivityStatus.APPROVED
  let flagReason: string | undefined

  if (speedKmH !== undefined && isSpeedSuspicious(type, speedKmH)) {
    status = ActivityStatus.FLAGGED
    flagReason = `Speed of ${speedKmH.toFixed(1)} km/h exceeds the threshold for ${type}`
  }

  // Calculate points to award
  const pointsEarned = status === ActivityStatus.APPROVED
    ? calculateActivityPoints(type, distanceKm, durationMinutes)
    : 0

  // Compute endedAt from startedAt + durationMinutes
  const endedAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000)

  // Create the activity record
  const activity = await prisma.activity.create({
    data: {
      userId,
      title,
      type,
      startedAt,
      endedAt,
      durationMinutes,
      distanceKm: distanceKm ?? null,
      speedKmH: speedKmH ?? null,
      paceMinPerKm: paceMinPerKm ?? null,
      description: description ?? null,
      gear: gear ?? null,
      effortLevel: effortLevel ?? null,
      heartRateAvg: heartRateAvg ?? null,
      heartRateMax: heartRateMax ?? null,
      cadence: cadence ?? null,
      powerWatts: powerWatts ?? null,
      temperature: temperature ?? null,
      caloriesBurned: caloriesBurned ?? null,
      visibility: visibility ?? ActivityVisibility.PUBLIC,
      status,
      pointsEarned,
      flagReason: flagReason ?? null,
    },
  })

  const carbonSaved = distanceKm != null ? (CARBON_KG_PER_KM[type] ?? 0) * distanceKm : 0

  if (status === ActivityStatus.APPROVED) {
    // Award points, create feed post, sync challenge progress in parallel
    await Promise.all([
      awardActivityPoints(userId, activity.id, type, distanceKm, durationMinutes),
      createFeedPost({
        userId,
        type: FeedPostType.ACTIVITY,
        activityId: activity.id,
      }),
      syncActivityProgress(userId, type, distanceKm, durationMinutes),
      syncSquadGoalProgress(userId, distanceKm, durationMinutes),
    ])
  }

  // Update PlayerProfile totals + carbon savings (only if APPROVED)
  const updatedProfile = status === ActivityStatus.APPROVED
    ? await prisma.playerProfile.upsert({
        where: { userId },
        create: {
          userId,
          totalDistance: distanceKm ?? 0,
          totalMinutes: durationMinutes,
          totalActivities: 1,
          lastActivityAt: startedAt,
          carbonSavedKg: carbonSaved,
        },
        update: {
          totalDistance: { increment: distanceKm ?? 0 },
          totalMinutes: { increment: durationMinutes },
          totalActivities: { increment: 1 },
          lastActivityAt: startedAt,
          carbonSavedKg: { increment: carbonSaved },
        },
      })
    : null

  // Check badges after profile totals are updated
  if (updatedProfile) {
    await checkBadgesForActivity(userId, type, updatedProfile.totalActivities, updatedProfile.totalDistance)
  }

  return activity
}

export async function getActivities(
  userId: string,
  options?: { page?: number; limit?: number; type?: ActivityType },
): Promise<{ activities: Activity[]; total: number }> {
  const page = options?.page ?? 1
  const limit = options?.limit ?? 20
  const skip = (page - 1) * limit

  const where = {
    userId,
    ...(options?.type ? { type: options.type } : {}),
  }

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.activity.count({ where }),
  ])

  return { activities, total }
}

export async function getActivityById(
  id: string,
): Promise<(Activity & { user: { id: string; name: string; nickname: string; avatarUrl: string | null }; routePoints: { id: string; latitude: number; longitude: number; altitude: number | null; speed: number | null; timestamp: Date; sequence: number }[] }) | null> {
  const activity = await prisma.activity.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          nickname: true,
          avatarUrl: true,
        },
      },
      routePoints: {
        orderBy: { sequence: 'asc' },
      },
    },
  })

  return activity
}

const publicFeedInclude = {
  user: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
  activity: true,
  userBadge: { include: { badge: true } },
  _count: { select: { reactions: true, comments: true } },
} as const

export async function getPublicFeed(
  options?: { page?: number; limit?: number },
): Promise<Prisma.FeedPostGetPayload<{ include: typeof publicFeedInclude }>[]> {
  const page = options?.page ?? 1
  const limit = options?.limit ?? 20
  const skip = (page - 1) * limit

  return prisma.feedPost.findMany({
    where: {
      visibility: ActivityVisibility.PUBLIC,
      moderationStatus: 'VISIBLE',
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    include: publicFeedInclude,
  })
}

export async function approveActivity(activityId: string, adminId: string): Promise<void> {
  const activity = await prisma.activity.findUniqueOrThrow({
    where: { id: activityId },
  })

  if (activity.status === ActivityStatus.APPROVED) {
    return
  }

  const pointsEarned = calculateActivityPoints(
    activity.type,
    activity.distanceKm ?? undefined,
    activity.durationMinutes,
  )

  await prisma.activity.update({
    where: { id: activityId },
    data: {
      status: ActivityStatus.APPROVED,
      pointsEarned,
      flagReason: null,
    },
  })

  const carbonSaved = activity.distanceKm != null ? (CARBON_KG_PER_KM[activity.type] ?? 0) * activity.distanceKm : 0

  // Full side-effect chain — identical to createActivity's approved path
  await Promise.all([
    awardActivityPoints(activity.userId, activityId, activity.type, activity.distanceKm ?? undefined, activity.durationMinutes),
    createFeedPost({
      userId: activity.userId,
      type: FeedPostType.ACTIVITY,
      activityId,
    }),
    syncActivityProgress(activity.userId, activity.type, activity.distanceKm ?? undefined, activity.durationMinutes),
    syncSquadGoalProgress(activity.userId, activity.distanceKm ?? undefined, activity.durationMinutes),
  ])

  // Update PlayerProfile totals now that activity is approved
  const updatedProfile = await prisma.playerProfile.upsert({
    where: { userId: activity.userId },
    create: {
      userId: activity.userId,
      totalDistance: activity.distanceKm ?? 0,
      totalMinutes: activity.durationMinutes,
      totalActivities: 1,
      lastActivityAt: activity.startedAt,
      carbonSavedKg: carbonSaved,
    },
    update: {
      totalDistance: { increment: activity.distanceKm ?? 0 },
      totalMinutes: { increment: activity.durationMinutes },
      totalActivities: { increment: 1 },
      lastActivityAt: activity.startedAt,
      carbonSavedKg: { increment: carbonSaved },
    },
  })

  // Badge check now that profile totals are updated
  await checkBadgesForActivity(activity.userId, activity.type, updatedProfile.totalActivities, updatedProfile.totalDistance)

  // Log admin action
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'APPROVE_ACTIVITY',
      entityType: 'Activity',
      entityId: activityId,
      details: `Activity approved. Points awarded: ${pointsEarned}`,
    },
  })
}

export async function rejectActivity(
  activityId: string,
  adminId: string,
  reason: string,
): Promise<void> {
  const activity = await prisma.activity.findUniqueOrThrow({
    where: { id: activityId },
    select: {
      status: true,
      userId: true,
      type: true,
      distanceKm: true,
      durationMinutes: true,
      pointsEarned: true,
    },
  })

  const wasApproved = activity.status === ActivityStatus.APPROVED

  if (wasApproved) {
    // Reverse all side-effects from the original approval in one transaction
    const carbonSaved =
      activity.distanceKm != null
        ? (CARBON_KG_PER_KM[activity.type] ?? 0) * activity.distanceKm
        : 0

    const profile = await prisma.playerProfile.findUnique({
      where: { userId: activity.userId },
      select: { lifetimePoints: true, totalPoints: true },
    })

    const deductPoints = Math.min(activity.pointsEarned, profile?.totalPoints ?? 0)
    const newLifetime = Math.max(0, (profile?.lifetimePoints ?? 0) - activity.pointsEarned)
    const newLevel = getLevelFromPoints(newLifetime)

    await prisma.$transaction([
      // Remove the awarded points ledger entry
      prisma.pointsLedger.deleteMany({
        where: { sourceType: 'ACTIVITY', sourceId: activityId },
      }),
      // Reverse PlayerProfile totals
      prisma.playerProfile.update({
        where: { userId: activity.userId },
        data: {
          totalPoints: { decrement: deductPoints },
          lifetimePoints: { decrement: activity.pointsEarned },
          totalDistance: { decrement: activity.distanceKm ?? 0 },
          totalMinutes: { decrement: activity.durationMinutes },
          totalActivities: { decrement: 1 },
          carbonSavedKg: { decrement: carbonSaved },
          level: newLevel,
        },
      }),
      // Remove the feed post so it no longer appears in feeds
      prisma.feedPost.deleteMany({ where: { activityId } }),
      // Mark the activity rejected
      prisma.activity.update({
        where: { id: activityId },
        data: { status: ActivityStatus.REJECTED, flagReason: reason, pointsEarned: 0 },
      }),
    ])
  } else {
    await prisma.activity.update({
      where: { id: activityId },
      data: { status: ActivityStatus.REJECTED, flagReason: reason, pointsEarned: 0 },
    })
  }

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'REJECT_ACTIVITY',
      entityType: 'Activity',
      entityId: activityId,
      details: `Activity rejected${wasApproved ? ' (was APPROVED — points and profile totals reversed)' : ''}. Reason: ${reason}`,
    },
  })
}
