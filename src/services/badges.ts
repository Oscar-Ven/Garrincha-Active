import { prisma } from '@/lib/db'
import { ActivityType, Badge, UserBadge, PointsSourceType, NotificationType } from '@/generated/prisma'
import { awardPoints } from '@/services/points'
import { createFeedPost } from '@/services/feed'
import { notifyUser } from '@/lib/notify'

export const BADGE_KEYS = [
  'first_activity',
  '5k_runner',
  '10k_runner',
  'football_starter',
  'match_player',
  'weekly_streak',
  'challenge_finisher',
  'center_champion',
  'reward_redeemer',
] as const

export type BadgeKey = (typeof BADGE_KEYS)[number]

export async function checkAndAwardBadge(
  userId: string,
  badgeKey: string,
): Promise<UserBadge | null> {
  const badge = await prisma.badge.findUnique({
    where: { key: badgeKey },
  })

  if (!badge) {
    return null
  }

  const existing = await prisma.userBadge.findUnique({
    where: {
      userId_badgeId: {
        userId,
        badgeId: badge.id,
      },
    },
  })

  if (existing) {
    return null
  }

  const userBadge = await prisma.userBadge.create({
    data: {
      userId,
      badgeId: badge.id,
    },
    include: {
      badge: true,
    },
  })

  await createFeedPost({
    userId,
    type: 'BADGE',
    content: `Earned the "${badge.name}" badge!`,
    userBadgeId: userBadge.id,
  })

  await awardPoints(
    userId,
    25,
    PointsSourceType.BADGE_AWARD,
    userBadge.id,
    `Badge earned: ${badge.name}`,
  )

  await notifyUser(userId, {
    type: NotificationType.BADGE_AWARDED,
    title: 'Badge Unlocked!',
    body: `You earned the "${badge.name}" badge.`,
    linkUrl: '/app/badges',
  })

  return userBadge
}

export async function checkBadgesForActivity(
  userId: string,
  activityType: ActivityType,
  totalActivities: number,
  totalDistance: number,
): Promise<void> {
  const checks: Promise<UserBadge | null>[] = []

  if (totalActivities >= 1) {
    checks.push(checkAndAwardBadge(userId, 'first_activity'))
  }

  if (totalDistance >= 5 && activityType === ActivityType.RUN) {
    checks.push(checkAndAwardBadge(userId, '5k_runner'))
  }

  if (totalDistance >= 10 && activityType === ActivityType.RUN) {
    checks.push(checkAndAwardBadge(userId, '10k_runner'))
  }

  if (activityType === ActivityType.FOOTBALL_TRAINING) {
    checks.push(checkAndAwardBadge(userId, 'football_starter'))
  }

  if (activityType === ActivityType.FOOTBALL_MATCH) {
    checks.push(checkAndAwardBadge(userId, 'match_player'))
  }

  await Promise.all(checks)
}

export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  return prisma.userBadge.findMany({
    where: { userId },
    include: {
      badge: true,
    },
    orderBy: { awardedAt: 'desc' },
  })
}

export async function getAllBadges(): Promise<Badge[]> {
  return prisma.badge.findMany({
    orderBy: { createdAt: 'asc' },
  })
}
