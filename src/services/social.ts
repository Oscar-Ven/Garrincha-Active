import { prisma } from '@/lib/db'
import { Follow, User, NotificationType } from '@/generated/prisma'

export async function followUser(followerId: string, followingId: string): Promise<Follow> {
  if (followerId === followingId) {
    throw new Error('A user cannot follow themselves')
  }

  const follow = await prisma.follow.upsert({
    where: {
      followerId_followingId: {
        followerId,
        followingId,
      },
    },
    update: {},
    create: {
      followerId,
      followingId,
    },
  })

  const follower = await prisma.user.findUnique({
    where: { id: followerId },
    select: { name: true, nickname: true },
  })

  await prisma.notification.create({
    data: {
      userId: followingId,
      type: NotificationType.NEW_FOLLOWER,
      title: 'New Follower',
      body: follower
        ? `${follower.name} (@${follower.nickname}) started following you`
        : 'Someone started following you',
      linkUrl: follower ? `/profile/${follower.nickname}` : undefined,
    },
  })

  return follow
}

export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  await prisma.follow.deleteMany({
    where: {
      followerId,
      followingId,
    },
  })
}

export async function getFollowers(userId: string): Promise<User[]> {
  const follows = await prisma.follow.findMany({
    where: { followingId: userId },
    include: {
      follower: {
        include: {
          playerProfile: true,
          center: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return follows.map((f) => f.follower)
}

export async function getFollowing(userId: string): Promise<User[]> {
  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    include: {
      following: {
        include: {
          playerProfile: true,
          center: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return follows.map((f) => f.following)
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const follow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        followingId,
      },
    },
    select: { id: true },
  })

  return follow !== null
}

export async function getFollowCounts(
  userId: string
): Promise<{ followers: number; following: number }> {
  const [followers, following] = await Promise.all([
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
  ])

  return { followers, following }
}

export async function searchPlayers(query: string, limit: number = 20): Promise<User[]> {
  const trimmed = query.trim()

  if (!trimmed) {
    return []
  }

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: trimmed } },
        { nickname: { contains: trimmed } },
        { email: { contains: trimmed } },
      ],
    },
    include: {
      playerProfile: true,
      center: true,
    },
    orderBy: { name: 'asc' },
    take: limit,
  })

  return users
}
