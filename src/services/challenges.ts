import { prisma } from '@/lib/db'
import { awardPoints } from '@/services/points'
import { checkAndAwardBadge } from '@/services/badges'
import { createFeedPost } from '@/services/feed'
import {
  Challenge,
  ChallengeParticipant,
  ChallengeType,
  ActivityType,
  PointsSourceType,
  FeedPostType,
  ActivityVisibility,
} from '@/generated/prisma'

// ─── Types ────────────────────────────────────────────────────────────────────

export type GetChallengesOptions = {
  centerId?: string
  type?: ChallengeType
  activeOnly?: boolean
  userId?: string
}

export type ChallengeWithDetail = Challenge & {
  _count: { participants: number }
  badge: { id: string; key: string; name: string; iconUrl: string | null } | null
  center: { id: string; name: string } | null
  sponsor: { id: string; name: string; logoUrl: string | null } | null
  userParticipant?: ChallengeParticipant | null
}

export type LeaderboardEntry = {
  user: {
    id: string
    name: string
    nickname: string
    avatarUrl: string | null
  }
  progress: number
  rank: number
}

export type CreateChallengeInput = {
  title: string
  description: string
  type: ChallengeType
  startDate: Date
  endDate: Date
  targetValue: number
  pointsReward: number
  badgeId?: string
  centerId?: string
  sponsorId?: string
  isActive?: boolean
  imageUrl?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isChallengeCurrentlyActive(challenge: Challenge): boolean {
  const now = new Date()
  return challenge.isActive && challenge.startDate <= now && challenge.endDate >= now
}

function computeProgressIncrement(
  challenge: Challenge,
  activityType: ActivityType,
  distanceKm?: number,
  durationMinutes?: number,
): number {
  switch (challenge.type) {
    case ChallengeType.DISTANCE: {
      // Only distance-based activities contribute
      const distanceTypes: ActivityType[] = [
        ActivityType.RUN,
        ActivityType.WALK,
        ActivityType.CYCLING,
      ]
      if (distanceTypes.includes(activityType) && distanceKm != null) {
        return distanceKm
      }
      return 0
    }

    case ChallengeType.ACTIVE_MINUTES: {
      return durationMinutes ?? 0
    }

    case ChallengeType.ACTIVITY_COUNT: {
      return 1
    }

    case ChallengeType.FOOTBALL_TRAINING_ATTENDANCE: {
      if (activityType === ActivityType.FOOTBALL_TRAINING) {
        return 1
      }
      return 0
    }

    case ChallengeType.MATCH_COUNT: {
      if (activityType === ActivityType.FOOTBALL_MATCH) {
        return 1
      }
      return 0
    }

    // POINTS, CENTER_VS_CENTER, TEAM — not driven by single activity sync
    default:
      return 0
  }
}

// ─── getChallenges ────────────────────────────────────────────────────────────

export async function getChallenges(
  options: GetChallengesOptions = {},
): Promise<ChallengeWithDetail[]> {
  const { centerId, type, activeOnly, userId } = options
  const now = new Date()

  const challenges = await prisma.challenge.findMany({
    where: {
      ...(centerId !== undefined ? { centerId } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(activeOnly
        ? {
            isActive: true,
            startDate: { lte: now },
            endDate: { gte: now },
          }
        : {}),
    },
    include: {
      badge: {
        select: { id: true, key: true, name: true, iconUrl: true },
      },
      center: {
        select: { id: true, name: true },
      },
      sponsor: {
        select: { id: true, name: true, logoUrl: true },
      },
      _count: {
        select: { participants: true },
      },
    },
    orderBy: { startDate: 'desc' },
  })

  if (!userId) {
    return challenges.map((c) => ({ ...c, userParticipant: undefined }))
  }

  const participations = await prisma.challengeParticipant.findMany({
    where: {
      userId,
      challengeId: { in: challenges.map((c) => c.id) },
    },
  })

  const participationMap = new Map(participations.map((p) => [p.challengeId, p]))

  return challenges.map((c) => ({
    ...c,
    userParticipant: participationMap.get(c.id) ?? null,
  }))
}

// ─── getChallengeById ─────────────────────────────────────────────────────────

export async function getChallengeById(
  id: string,
  userId?: string,
): Promise<ChallengeWithDetail | null> {
  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: {
      badge: {
        select: { id: true, key: true, name: true, iconUrl: true },
      },
      center: {
        select: { id: true, name: true },
      },
      sponsor: {
        select: { id: true, name: true, logoUrl: true },
      },
      _count: {
        select: { participants: true },
      },
    },
  })

  if (!challenge) return null

  if (!userId) {
    return { ...challenge, userParticipant: undefined }
  }

  const userParticipant = await prisma.challengeParticipant.findUnique({
    where: {
      challengeId_userId: { challengeId: id, userId },
    },
  })

  return { ...challenge, userParticipant: userParticipant ?? null }
}

// ─── joinChallenge ────────────────────────────────────────────────────────────

export async function joinChallenge(
  userId: string,
  challengeId: string,
): Promise<ChallengeParticipant> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
  })

  if (!challenge) {
    throw new Error('Challenge not found')
  }

  if (!isChallengeCurrentlyActive(challenge)) {
    throw new Error('Challenge is not currently active')
  }

  const existing = await prisma.challengeParticipant.findUnique({
    where: {
      challengeId_userId: { challengeId, userId },
    },
  })

  if (existing) {
    throw new Error('User has already joined this challenge')
  }

  const participant = await prisma.challengeParticipant.create({
    data: {
      challengeId,
      userId,
      progress: 0,
      isCompleted: false,
    },
  })

  return participant
}

// ─── updateChallengeProgress ──────────────────────────────────────────────────

export async function updateChallengeProgress(
  userId: string,
  challengeId: string,
  increment: number,
): Promise<ChallengeParticipant> {
  const participant = await prisma.challengeParticipant.findUnique({
    where: {
      challengeId_userId: { challengeId, userId },
    },
    include: {
      challenge: true,
    },
  })

  if (!participant) {
    throw new Error('User is not participating in this challenge')
  }

  const newProgress = participant.progress + increment
  const { challenge } = participant
  const alreadyCompleted = participant.isCompleted
  const nowCompleted = !alreadyCompleted && newProgress >= challenge.targetValue

  const updated = await prisma.challengeParticipant.update({
    where: {
      challengeId_userId: { challengeId, userId },
    },
    data: {
      progress: newProgress,
      ...(nowCompleted
        ? {
            isCompleted: true,
            completedAt: new Date(),
          }
        : {}),
    },
  })

  if (nowCompleted) {
    // Award points for challenge completion
    await awardPoints(
      userId,
      challenge.pointsReward,
      PointsSourceType.CHALLENGE_COMPLETION,
      challengeId,
      `Completed challenge: ${challenge.title}`,
    )

    // Award badge if challenge has one configured
    if (challenge.badgeId) {
      await checkAndAwardBadge(userId, challenge.badgeId)
    }

    // Create feed post to announce the completion
    await createFeedPost({
      userId,
      type: FeedPostType.CHALLENGE_COMPLETION,
      content: `I just completed the "${challenge.title}" challenge!`,
      challengeParticipantId: updated.id,
    })
  }

  return updated
}

// ─── getChallengeLeaderboard ──────────────────────────────────────────────────

export async function getChallengeLeaderboard(
  challengeId: string,
): Promise<LeaderboardEntry[]> {
  const participants = await prisma.challengeParticipant.findMany({
    where: { challengeId },
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
    orderBy: [{ progress: 'desc' }, { joinedAt: 'asc' }],
  })

  return participants.map((p, index) => ({
    user: p.user,
    progress: p.progress,
    rank: index + 1,
  }))
}

// ─── syncActivityProgress ─────────────────────────────────────────────────────

export async function syncActivityProgress(
  userId: string,
  activityType: ActivityType,
  distanceKm?: number,
  durationMinutes?: number,
): Promise<void> {
  const now = new Date()

  // Find all active challenges the user has joined that are currently running
  const activeParticipations = await prisma.challengeParticipant.findMany({
    where: {
      userId,
      isCompleted: false,
      challenge: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    },
    include: {
      challenge: true,
    },
  })

  for (const participation of activeParticipations) {
    const increment = computeProgressIncrement(
      participation.challenge,
      activityType,
      distanceKm,
      durationMinutes,
    )

    if (increment > 0) {
      await updateChallengeProgress(userId, participation.challengeId, increment)
    }
  }
}

// ─── createChallenge ──────────────────────────────────────────────────────────

export async function createChallenge(
  data: CreateChallengeInput,
  adminId: string,
): Promise<Challenge> {
  const challenge = await prisma.challenge.create({
    data: {
      title: data.title,
      description: data.description,
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
      targetValue: data.targetValue,
      pointsReward: data.pointsReward,
      isActive: data.isActive ?? true,
      ...(data.badgeId !== undefined ? { badgeId: data.badgeId } : {}),
      ...(data.centerId !== undefined ? { centerId: data.centerId } : {}),
      ...(data.sponsorId !== undefined ? { sponsorId: data.sponsorId } : {}),
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
    },
  })

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'CREATE_CHALLENGE',
      entityType: 'Challenge',
      entityId: challenge.id,
      details: `Created challenge: ${challenge.title}`,
    },
  })

  return challenge
}
