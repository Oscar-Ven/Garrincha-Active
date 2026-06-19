import { prisma } from '@/lib/db'
import { LeaderboardEntry } from '@/types'

export type LeaderboardFilter = 'global' | 'center' | 'weekly' | 'monthly'
export type LeaderboardMetric = 'points' | 'distance' | 'minutes'

function getDateRange(filter: LeaderboardFilter): { start: Date; end: Date } | null {
  const now = new Date()

  if (filter === 'weekly') {
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay())
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    return { start, end }
  }

  if (filter === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0)
    return { start, end }
  }

  return null
}

export async function getLeaderboard(options: {
  filter?: LeaderboardFilter
  centerId?: string
  metric?: LeaderboardMetric
  limit?: number
  challengeId?: string
}): Promise<LeaderboardEntry[]> {
  const {
    filter = 'global',
    centerId,
    metric = 'points',
    limit = 50,
  } = options

  const dateRange = getDateRange(filter)

  if (dateRange) {
    // For time-bounded filters we aggregate from activities directly
    const activityWhere: Record<string, unknown> = {
      status: 'APPROVED',
      startedAt: {
        gte: dateRange.start,
        lt: dateRange.end,
      },
    }

    if (filter === 'center' && centerId) {
      activityWhere.user = { centerId }
    }

    const grouped = await prisma.activity.groupBy({
      by: ['userId'],
      where: activityWhere as Parameters<typeof prisma.activity.groupBy>[0]['where'],
      _sum: {
        pointsEarned: true,
        distanceKm: true,
        durationMinutes: true,
      },
      orderBy:
        metric === 'points'
          ? { _sum: { pointsEarned: 'desc' } }
          : metric === 'distance'
          ? { _sum: { distanceKm: 'desc' } }
          : { _sum: { durationMinutes: 'desc' } },
      take: limit,
    })

    if (grouped.length === 0) return []

    const userIds = grouped.map((g) => g.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        nickname: true,
        avatarUrl: true,
        centerId: true,
        center: { select: { id: true, name: true } },
        playerProfile: {
          select: { totalPoints: true, totalDistance: true, totalMinutes: true },
        },
      },
    })

    const userMap = new Map(users.map((u) => [u.id, u]))

    return grouped.map((g, index) => {
      const user = userMap.get(g.userId)
      return {
        rank: index + 1,
        userId: g.userId,
        name: user?.name ?? '',
        nickname: user?.nickname ?? '',
        avatarUrl: user?.avatarUrl ?? null,
        centerId: user?.centerId ?? null,
        centerName: user?.center?.name ?? null,
        points: g._sum.pointsEarned ?? 0,
        distance: g._sum.distanceKm ?? 0,
        minutes: g._sum.durationMinutes ?? 0,
      }
    })
  }

  // Global or center filter — sort by stored profile totals
  const profileWhere: Record<string, unknown> = {}

  if (filter === 'center' && centerId) {
    profileWhere.user = { centerId }
  }

  const orderByField =
    metric === 'points'
      ? 'totalPoints'
      : metric === 'distance'
      ? 'totalDistance'
      : 'totalMinutes'

  const profiles = await prisma.playerProfile.findMany({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: profileWhere as any,
    orderBy: { [orderByField]: 'desc' },
    take: limit,
    select: {
      totalPoints: true,
      totalDistance: true,
      totalMinutes: true,
      user: {
        select: {
          id: true,
          name: true,
          nickname: true,
          avatarUrl: true,
          centerId: true,
          center: { select: { id: true, name: true } },
        },
      },
    },
  })

  return profiles.map((p, index) => ({
    rank: index + 1,
    userId: p.user.id,
    name: p.user.name,
    nickname: p.user.nickname,
    avatarUrl: p.user.avatarUrl ?? null,
    centerId: p.user.centerId ?? null,
    centerName: p.user.center?.name ?? null,
    points: p.totalPoints,
    distance: p.totalDistance,
    minutes: p.totalMinutes,
  }))
}

export async function getChallengeLeaderboard(
  challengeId: string,
): Promise<
  Array<{
    rank: number
    user: { id: string; name: string; nickname: string; avatarUrl: string | null }
    progress: number
    isCompleted: boolean
  }>
> {
  const participants = await prisma.challengeParticipant.findMany({
    where: { challengeId },
    orderBy: [{ isCompleted: 'desc' }, { progress: 'desc' }, { completedAt: 'asc' }],
    select: {
      progress: true,
      isCompleted: true,
      user: {
        select: {
          id: true,
          name: true,
          nickname: true,
          avatarUrl: true,
        },
      },
    },
  })

  return participants.map((p, index) => ({
    rank: index + 1,
    user: {
      id: p.user.id,
      name: p.user.name,
      nickname: p.user.nickname,
      avatarUrl: p.user.avatarUrl ?? null,
    },
    progress: p.progress,
    isCompleted: p.isCompleted,
  }))
}

export async function getFriendsLeaderboard(
  userId: string,
  metric: LeaderboardMetric = 'points',
): Promise<LeaderboardEntry[]> {
  // Collect all userIds to include: the people the user follows + themselves
  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  })
  const friendIds = [userId, ...follows.map((f) => f.followingId)]

  const orderByField =
    metric === 'points'
      ? 'totalPoints'
      : metric === 'distance'
      ? 'totalDistance'
      : 'totalMinutes'

  const profiles = await prisma.playerProfile.findMany({
    where: { userId: { in: friendIds } },
    orderBy: { [orderByField]: 'desc' },
    select: {
      totalPoints: true,
      totalDistance: true,
      totalMinutes: true,
      level: true,
      user: {
        select: {
          id: true,
          name: true,
          nickname: true,
          avatarUrl: true,
          centerId: true,
          center: { select: { id: true, name: true } },
        },
      },
    },
  })

  return profiles.map((p, index) => ({
    rank: index + 1,
    userId: p.user.id,
    name: p.user.name,
    nickname: p.user.nickname,
    avatarUrl: p.user.avatarUrl ?? null,
    centerId: p.user.centerId ?? null,
    centerName: p.user.center?.name ?? null,
    points: p.totalPoints,
    distance: p.totalDistance,
    minutes: p.totalMinutes,
  }))
}

export async function getPlayerRank(
  userId: string,
  metric: LeaderboardMetric = 'points',
): Promise<number> {
  const orderByField =
    metric === 'points'
      ? 'totalPoints'
      : metric === 'distance'
      ? 'totalDistance'
      : 'totalMinutes'

  const profile = await prisma.playerProfile.findUnique({
    where: { userId },
    select: { totalPoints: true, totalDistance: true, totalMinutes: true },
  })

  if (!profile) return 0

  const playerValue =
    metric === 'points'
      ? profile.totalPoints
      : metric === 'distance'
      ? profile.totalDistance
      : profile.totalMinutes

  const higherCount = await prisma.playerProfile.count({
    where: { [orderByField]: { gt: playerValue } },
  })

  return higherCount + 1
}
