import { prisma } from '@/lib/db'
import { PrismaClient } from '@/generated/prisma/client'
import type { User } from '@/generated/prisma'
import {
  Role,
  ActivityStatus,
  RedemptionStatus,
  EventStatus,
  PointsSourceType,
  NotificationType,
  Prisma,
} from '@/generated/prisma'

type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

// ─── Audit Logging ────────────────────────────────────────────────────────────

export async function logAdminAction(
  adminId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  details?: string,
): Promise<void> {
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      details: details ?? null,
    },
  })
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface DashboardStats {
  totalPlayers: number
  activePlayers: number
  totalActivities: number
  totalPointsIssued: number
  rewardsRedeemed: number
  activeChallenges: number
  upcomingEvents: number
  flaggedActivities: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [
    totalPlayers,
    activePlayerIds,
    totalActivities,
    pointsAggregate,
    rewardsRedeemed,
    activeChallenges,
    upcomingEvents,
    flaggedActivities,
  ] = await Promise.all([
    // Total users with PLAYER role
    prisma.user.count({
      where: { role: Role.PLAYER },
    }),

    // Active players: users who logged an activity in the last 7 days
    prisma.activity.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        user: { role: Role.PLAYER },
      },
      select: { userId: true },
      distinct: ['userId'],
    }),

    // All activities
    prisma.activity.count(),

    // Sum of positive points from the ledger
    prisma.pointsLedger.aggregate({
      _sum: { points: true },
      where: { points: { gt: 0 } },
    }),

    // Redemptions that are PENDING or USED
    prisma.rewardRedemption.count({
      where: {
        status: { in: [RedemptionStatus.PENDING, RedemptionStatus.USED] },
      },
    }),

    // Challenges that are active and not yet expired
    prisma.challenge.count({
      where: {
        isActive: true,
        endDate: { gte: now },
      },
    }),

    // PUBLISHED events starting in the future
    prisma.event.count({
      where: {
        status: EventStatus.PUBLISHED,
        startDate: { gte: now },
      },
    }),

    // FLAGGED activities
    prisma.activity.count({
      where: { status: ActivityStatus.FLAGGED },
    }),
  ])

  return {
    totalPlayers,
    activePlayers: activePlayerIds.length,
    totalActivities,
    totalPointsIssued: pointsAggregate._sum.points ?? 0,
    rewardsRedeemed,
    activeChallenges,
    upcomingEvents,
    flaggedActivities,
  }
}

// ─── Players ──────────────────────────────────────────────────────────────────

export interface GetPlayersOptions {
  search?: string
  centerId?: string
  page?: number
  limit?: number
}

export interface GetPlayersResult {
  players: (User & {
    playerProfile: {
      totalPoints: number
      level: string
      totalActivities: number
      lastActivityAt: Date | null
    } | null
    center: { id: string; name: string } | null
  })[]
  total: number
}

export async function getPlayers(
  options: GetPlayersOptions = {},
): Promise<GetPlayersResult> {
  const { search, centerId, page = 1, limit = 20 } = options
  const skip = (page - 1) * limit

  const where = {
    role: Role.PLAYER,
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { nickname: { contains: search } },
          ],
        }
      : {}),
    ...(centerId ? { centerId } : {}),
  }

  const [players, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        playerProfile: {
          select: {
            totalPoints: true,
            level: true,
            totalActivities: true,
            lastActivityAt: true,
          },
        },
        center: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ])

  return { players, total }
}

// ─── Player Detail ────────────────────────────────────────────────────────────

export async function getPlayerDetail(userId: string) {
  const player = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      playerProfile: true,
      center: true,
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      pointsLedger: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      rewardRedemptions: {
        include: { reward: true },
        orderBy: { createdAt: 'desc' },
      },
      userBadges: {
        include: { badge: true },
        orderBy: { awardedAt: 'desc' },
      },
      challengeParticipants: {
        include: { challenge: true },
        orderBy: { joinedAt: 'desc' },
      },
      eventRegistrations: {
        include: { event: true },
        orderBy: { registeredAt: 'desc' },
      },
      teamMemberships: {
        include: { team: true },
      },
      followers: {
        include: { follower: { select: { id: true, name: true, avatarUrl: true } } },
      },
      following: {
        include: { following: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  })

  return player
}

// ─── Ban Player ───────────────────────────────────────────────────────────────

export async function banPlayer(userId: string, adminId: string): Promise<void> {
  await prisma.$transaction(async (tx: TransactionClient) => {
    await tx.user.update({
      where: { id: userId },
      data: { isActive: false },
    })

    await tx.adminAuditLog.create({
      data: {
        adminId,
        action: 'BAN_PLAYER',
        entityType: 'User',
        entityId: userId,
        details: `Player ${userId} was banned by admin ${adminId}`,
      },
    })

    await tx.notification.create({
      data: {
        userId,
        type: NotificationType.ADMIN_MESSAGE,
        title: 'Account Suspended',
        body: 'Your account has been suspended by an administrator. Please contact support for more information.',
      },
    })
  })
}

// ─── Award Admin Points ───────────────────────────────────────────────────────

export async function awardAdminPoints(
  userId: string,
  points: number,
  reason: string,
  adminId: string,
): Promise<void> {
  await prisma.$transaction(async (tx: TransactionClient) => {
    await tx.pointsLedger.create({
      data: {
        userId,
        sourceType: PointsSourceType.ADMIN_BONUS,
        points,
        reason,
      },
    })

    await tx.playerProfile.update({
      where: { userId },
      data: {
        totalPoints: { increment: points },
        lifetimePoints: points > 0 ? { increment: points } : undefined,
      },
    })

    await tx.adminAuditLog.create({
      data: {
        adminId,
        action: 'AWARD_POINTS',
        entityType: 'User',
        entityId: userId,
        details: `Awarded ${points} points to user ${userId}. Reason: ${reason}`,
      },
    })

    await tx.notification.create({
      data: {
        userId,
        type: NotificationType.POINTS_RECEIVED,
        title: `${points > 0 ? '+' : ''}${points} Points`,
        body: reason,
      },
    })
  })
}

// ─── Flagged Activities ───────────────────────────────────────────────────────

const flaggedActivityInclude = {
  user: { select: { id: true, name: true, nickname: true, avatarUrl: true, email: true } },
  media: true,
} as const

export async function getFlaggedActivities(): Promise<
  Prisma.ActivityGetPayload<{ include: typeof flaggedActivityInclude }>[]
> {
  return prisma.activity.findMany({
    where: { status: ActivityStatus.FLAGGED },
    include: flaggedActivityInclude,
    orderBy: { updatedAt: 'desc' },
  })
}

// ─── Reported Posts ───────────────────────────────────────────────────────────

const reportedPostInclude = {
  reporter: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
  reported: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
  post: {
    include: {
      user: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
      reactions: true,
      comments: { take: 3, orderBy: { createdAt: 'desc' as const } },
    },
  },
} as const

export async function getReportedPosts(): Promise<
  Prisma.ReportGetPayload<{ include: typeof reportedPostInclude }>[]
> {
  return prisma.report.findMany({
    where: { resolved: false },
    include: reportedPostInclude,
    orderBy: { createdAt: 'desc' },
  })
}

// ─── Engagement by Center ─────────────────────────────────────────────────────

export interface CenterEngagement {
  center: {
    id: string
    name: string
    city: string | null
    logoUrl: string | null
  }
  playerCount: number
  activityCount: number
  totalPoints: number
}

export async function getEngagementByCenter(): Promise<CenterEngagement[]> {
  const centers = await prisma.center.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      city: true,
      logoUrl: true,
      players: {
        where: { role: Role.PLAYER },
        select: {
          id: true,
          activities: {
            select: {
              id: true,
              pointsEarned: true,
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  const result: CenterEngagement[] = centers.map((center) => {
    const playerCount = center.players.length
    let activityCount = 0
    let totalPoints = 0

    for (const player of center.players) {
      activityCount += player.activities.length
      for (const activity of player.activities) {
        totalPoints += activity.pointsEarned
      }
    }

    return {
      center: {
        id: center.id,
        name: center.name,
        city: center.city,
        logoUrl: center.logoUrl,
      },
      playerCount,
      activityCount,
      totalPoints,
    }
  })

  // Sort descending by player count
  result.sort((a, b) => b.playerCount - a.playerCount)

  return result
}
