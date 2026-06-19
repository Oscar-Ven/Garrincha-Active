import { prisma } from '@/lib/db'
import { FeedPostType, ActivityVisibility, ModerationStatus } from '@/generated/prisma'
import type { FeedPost, FeedComment, Report } from '@/generated/prisma'

// ─── Shared include shape ────────────────────────────────────────────────────

const feedPostInclude = {
  user: {
    select: { id: true, name: true, nickname: true, avatarUrl: true },
  },
  activity: true,
  userBadge: { include: { badge: true } },
  challengeParticipant: { include: { challenge: true } },
  rewardRedemption: { include: { reward: true } },
  eventRegistration: { include: { event: true } },
  comments: {
    where: { moderationStatus: 'VISIBLE' as const },
    include: { user: { select: { id: true, name: true, nickname: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' as const },
    take: 20,
  },
  reactions: { select: { userId: true, type: true } },
  _count: { select: { comments: true, reactions: true } },
} as const

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createFeedPost(data: {
  userId: string
  type: FeedPostType
  content?: string
  activityId?: string
  userBadgeId?: string
  challengeParticipantId?: string
  rewardRedemptionId?: string
  eventRegistrationId?: string
}): Promise<FeedPost> {
  // Inherit visibility from the linked activity when present, default to PUBLIC
  let visibility: ActivityVisibility = ActivityVisibility.PUBLIC

  if (data.activityId) {
    const activity = await prisma.activity.findUnique({
      where: { id: data.activityId },
      select: { visibility: true },
    })
    if (activity) {
      visibility = activity.visibility
    }
  }

  return prisma.feedPost.create({
    data: {
      userId: data.userId,
      type: data.type,
      content: data.content,
      visibility,
      activityId: data.activityId,
      userBadgeId: data.userBadgeId,
      challengeParticipantId: data.challengeParticipantId,
      rewardRedemptionId: data.rewardRedemptionId,
      eventRegistrationId: data.eventRegistrationId,
    },
    include: feedPostInclude,
  }) as unknown as FeedPost
}

// ─── Public feed ─────────────────────────────────────────────────────────────

export async function getPublicFeed(options?: {
  page?: number
  limit?: number
  userId?: string
}): Promise<FeedPost[]> {
  const page = options?.page ?? 1
  const limit = options?.limit ?? 20
  const skip = (page - 1) * limit

  return prisma.feedPost.findMany({
    where: {
      visibility: ActivityVisibility.PUBLIC,
      moderationStatus: ModerationStatus.VISIBLE,
    },
    include: feedPostInclude,
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  }) as unknown as FeedPost[]
}

// ─── Following feed ───────────────────────────────────────────────────────────

export async function getFollowingFeed(
  userId: string,
  options?: { page?: number; limit?: number },
): Promise<FeedPost[]> {
  const page = options?.page ?? 1
  const limit = options?.limit ?? 20
  const skip = (page - 1) * limit

  // Collect IDs of users the current user follows
  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  })
  const followingIds = follows.map((f) => f.followingId)

  // Include the user's own posts as well as followed users' posts
  const authorIds = [userId, ...followingIds]

  return prisma.feedPost.findMany({
    where: {
      userId: { in: authorIds },
      moderationStatus: ModerationStatus.VISIBLE,
      OR: [
        { visibility: ActivityVisibility.PUBLIC },
        { visibility: ActivityVisibility.FOLLOWERS },
      ],
    },
    include: feedPostInclude,
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  }) as unknown as FeedPost[]
}

// ─── User feed ────────────────────────────────────────────────────────────────

export async function getUserFeed(userId: string): Promise<FeedPost[]> {
  return prisma.feedPost.findMany({
    where: {
      userId,
      moderationStatus: ModerationStatus.VISIBLE,
    },
    include: feedPostInclude,
    orderBy: { createdAt: 'desc' },
  }) as unknown as FeedPost[]
}

// ─── Reactions (kudos) ────────────────────────────────────────────────────────

export async function addKudos(postId: string, userId: string): Promise<void> {
  await prisma.feedReaction.upsert({
    where: { postId_userId: { postId, userId } },
    create: { postId, userId, type: 'KUDOS' },
    update: { type: 'KUDOS' },
  })
}

export async function removeKudos(postId: string, userId: string): Promise<void> {
  await prisma.feedReaction.deleteMany({
    where: { postId, userId },
  })
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function addComment(
  postId: string,
  userId: string,
  content: string,
): Promise<FeedComment> {
  return prisma.feedComment.create({
    data: { postId, userId, content },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          nickname: true,
          avatarUrl: true,
        },
      },
    },
  }) as unknown as FeedComment
}

export async function getComments(postId: string): Promise<FeedComment[]> {
  return prisma.feedComment.findMany({
    where: {
      postId,
      moderationStatus: ModerationStatus.VISIBLE,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          nickname: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  }) as unknown as FeedComment[]
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function reportPost(
  postId: string,
  reporterId: string,
  reason: string,
): Promise<Report> {
  // Fetch the post author so we can link the reported user
  const post = await prisma.feedPost.findUnique({
    where: { id: postId },
    select: { userId: true },
  })

  return prisma.report.create({
    data: {
      reporterId,
      reportedId: post?.userId,
      postId,
      reason,
    },
  })
}

// ─── Moderation ───────────────────────────────────────────────────────────────

export async function moderatePost(
  postId: string,
  status: ModerationStatus,
  adminId: string,
): Promise<void> {
  await prisma.$transaction([
    prisma.feedPost.update({
      where: { id: postId },
      data: { moderationStatus: status },
    }),
    prisma.adminAuditLog.create({
      data: {
        adminId,
        action: `SET_POST_MODERATION_${status}`,
        entityType: 'FeedPost',
        entityId: postId,
        details: `Post moderation status set to ${status} by admin ${adminId}`,
      },
    }),
  ])
}
