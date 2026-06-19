import { prisma } from '@/lib/db'
import { ActivityType, PointsSourceType, Level } from '@/generated/prisma'
import type { PointsLedger } from '@/generated/prisma'
import {
  calculateActivityPoints,
  LEVEL_THRESHOLDS,
  getLevelFromPoints,
  MAX_DAILY_ACTIVITY_POINTS,
} from '@/lib/points-rules'

export async function awardActivityPoints(
  userId: string,
  activityId: string,
  type: ActivityType,
  distanceKm?: number,
  durationMinutes?: number,
): Promise<number> {
  const rawPoints = calculateActivityPoints(type, distanceKm, durationMinutes)

  if (rawPoints <= 0) {
    return 0
  }

  const dailyUsed = await getDailyPointsUsed(userId)
  const remaining = MAX_DAILY_ACTIVITY_POINTS - dailyUsed

  if (remaining <= 0) {
    return 0
  }

  const pointsToAward = Math.min(rawPoints, remaining)

  await prisma.$transaction(async (tx) => {
    await tx.pointsLedger.create({
      data: {
        userId,
        sourceType: PointsSourceType.ACTIVITY,
        sourceId: activityId,
        points: pointsToAward,
        reason: `Activity points for ${type}`,
      },
    })

    const profile = await tx.playerProfile.findUnique({
      where: { userId },
      select: { lifetimePoints: true, level: true },
    })

    if (!profile) {
      throw new Error(`PlayerProfile not found for user ${userId}`)
    }

    const newLifetimePoints = profile.lifetimePoints + pointsToAward
    const newLevel = getLevelFromPoints(newLifetimePoints)

    await tx.playerProfile.update({
      where: { userId },
      data: {
        totalPoints: { increment: pointsToAward },
        lifetimePoints: { increment: pointsToAward },
        level: newLevel,
      },
    })
  })

  return pointsToAward
}

export async function awardPoints(
  userId: string,
  points: number,
  sourceType: PointsSourceType,
  sourceId?: string,
  reason?: string,
): Promise<void> {
  if (points <= 0) {
    return
  }

  await prisma.$transaction(async (tx) => {
    await tx.pointsLedger.create({
      data: {
        userId,
        sourceType,
        sourceId: sourceId ?? null,
        points,
        reason: reason ?? `Points awarded: ${sourceType}`,
      },
    })

    const profile = await tx.playerProfile.findUnique({
      where: { userId },
      select: { lifetimePoints: true },
    })

    if (!profile) {
      throw new Error(`PlayerProfile not found for user ${userId}`)
    }

    const newLifetimePoints = profile.lifetimePoints + points
    const newLevel = getLevelFromPoints(newLifetimePoints)

    await tx.playerProfile.update({
      where: { userId },
      data: {
        totalPoints: { increment: points },
        lifetimePoints: { increment: points },
        level: newLevel,
      },
    })
  })
}

export async function deductPoints(
  userId: string,
  points: number,
  reason: string,
  sourceId?: string,
): Promise<void> {
  if (points <= 0) {
    throw new Error('Deduction amount must be greater than zero')
  }

  await prisma.$transaction(async (tx) => {
    const profile = await tx.playerProfile.findUnique({
      where: { userId },
      select: { totalPoints: true },
    })

    if (!profile) {
      throw new Error(`PlayerProfile not found for user ${userId}`)
    }

    if (profile.totalPoints < points) {
      throw new Error(
        `Insufficient points: user has ${profile.totalPoints} but tried to deduct ${points}`,
      )
    }

    await tx.pointsLedger.create({
      data: {
        userId,
        sourceType: PointsSourceType.REDEMPTION_DEBIT,
        sourceId: sourceId ?? null,
        points: -points,
        reason,
      },
    })

    await tx.playerProfile.update({
      where: { userId },
      data: {
        totalPoints: { decrement: points },
      },
    })
  })
}

export async function getUserPoints(
  userId: string,
): Promise<{ totalPoints: number; lifetimePoints: number; level: Level }> {
  const profile = await prisma.playerProfile.findUnique({
    where: { userId },
    select: {
      totalPoints: true,
      lifetimePoints: true,
      level: true,
    },
  })

  if (!profile) {
    throw new Error(`PlayerProfile not found for user ${userId}`)
  }

  return {
    totalPoints: profile.totalPoints,
    lifetimePoints: profile.lifetimePoints,
    level: profile.level,
  }
}

export async function getPointsHistory(
  userId: string,
  limit = 50,
): Promise<PointsLedger[]> {
  return prisma.pointsLedger.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function checkAndUpdateLevel(userId: string): Promise<void> {
  const profile = await prisma.playerProfile.findUnique({
    where: { userId },
    select: { lifetimePoints: true, level: true },
  })

  if (!profile) {
    throw new Error(`PlayerProfile not found for user ${userId}`)
  }

  const newLevel = getLevelFromPoints(profile.lifetimePoints)

  if (newLevel !== profile.level) {
    await prisma.playerProfile.update({
      where: { userId },
      data: { level: newLevel },
    })
  }
}

export async function getDailyPointsUsed(userId: string): Promise<number> {
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1)

  const result = await prisma.pointsLedger.findMany({
    where: {
      userId,
      sourceType: PointsSourceType.ACTIVITY,
      createdAt: {
        gte: todayStart,
        lt: tomorrowStart,
      },
    },
    select: { points: true },
  })

  return result.reduce((sum, entry) => sum + entry.points, 0)
}
