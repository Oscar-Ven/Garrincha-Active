import { prisma } from '@/lib/db'
import { deductPoints, awardPoints } from '@/services/points'
import { createFeedPost } from '@/services/feed'
import {
  Reward,
  RewardRedemption,
  RewardCategory,
  RedemptionStatus,
  PointsSourceType,
} from '@/generated/prisma'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateRewardInput = {
  title: string
  description: string
  imageUrl?: string
  pointsCost: number
  stock?: number
  category: RewardCategory
  isActive?: boolean
  expiresAt?: Date
  centerId?: string
  sponsorId?: string
}

export type GetRewardsOptions = {
  centerId?: string
  sponsorId?: string
  category?: RewardCategory
  activeOnly?: boolean
}

type RewardWithRelations = Reward & {
  center: { id: string; name: string } | null
  sponsor: { id: string; name: string; logoUrl: string | null } | null
  _count: { redemptions: number }
}

type RewardRedemptionWithRelations = RewardRedemption & {
  reward: {
    id: string
    title: string
    imageUrl: string | null
    category: RewardCategory
    pointsCost: number
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getRewards(
  options?: GetRewardsOptions,
): Promise<RewardWithRelations[]> {
  const where: {
    centerId?: string
    sponsorId?: string
    category?: RewardCategory
    isActive?: boolean
  } = {}

  if (options?.centerId !== undefined) where.centerId = options.centerId
  if (options?.sponsorId !== undefined) where.sponsorId = options.sponsorId
  if (options?.category !== undefined) where.category = options.category
  if (options?.activeOnly) where.isActive = true

  return prisma.reward.findMany({
    where,
    include: {
      center: { select: { id: true, name: true } },
      sponsor: { select: { id: true, name: true, logoUrl: true } },
      _count: { select: { redemptions: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getRewardById(
  id: string,
): Promise<RewardWithRelations & { _count: { redemptions: number } }> {
  const reward = await prisma.reward.findUnique({
    where: { id },
    include: {
      center: { select: { id: true, name: true } },
      sponsor: { select: { id: true, name: true, logoUrl: true } },
      _count: { select: { redemptions: true } },
    },
  })

  if (!reward) {
    throw new Error('Reward not found')
  }

  return reward
}

// ─── Redemption ───────────────────────────────────────────────────────────────

export async function redeemReward(
  userId: string,
  rewardId: string,
): Promise<RewardRedemption & { redemptionCode: string }> {
  // Fetch user profile for points balance
  const playerProfile = await prisma.playerProfile.findUnique({
    where: { userId },
  })

  if (!playerProfile) {
    throw new Error('Player profile not found')
  }

  // Fetch reward
  const reward = await prisma.reward.findUnique({
    where: { id: rewardId },
  })

  if (!reward) {
    throw new Error('Reward not found')
  }

  // Check reward is active
  if (!reward.isActive) {
    throw new Error('Reward not available')
  }

  // Check expiry
  if (reward.expiresAt && reward.expiresAt < new Date()) {
    throw new Error('Reward not available')
  }

  // Check stock (stock === -1 means unlimited)
  if (reward.stock !== -1 && reward.stock <= 0) {
    throw new Error('Out of stock')
  }

  // Check if user has enough points
  if (playerProfile.totalPoints < reward.pointsCost) {
    throw new Error('Insufficient points')
  }

  // Check if user has already redeemed this reward and it is still pending/used
  const existingRedemption = await prisma.rewardRedemption.findFirst({
    where: {
      userId,
      rewardId,
      status: { in: [RedemptionStatus.PENDING, RedemptionStatus.USED] },
    },
  })

  if (existingRedemption) {
    throw new Error('Already redeemed')
  }

  // Deduct points first
  await deductPoints(userId, reward.pointsCost, `Redeemed reward: ${reward.title}`, rewardId)

  // Create redemption record and decrement stock
  const redemption = await prisma.$transaction(async (tx) => {
    // Decrement stock if finite
    if (reward.stock >= 0) {
      await tx.reward.update({
        where: { id: rewardId },
        data: { stock: { decrement: 1 } },
      })
    }

    // Create redemption record
    return tx.rewardRedemption.create({
      data: {
        userId,
        rewardId,
        pointsSpent: reward.pointsCost,
        status: RedemptionStatus.PENDING,
      },
    })
  })

  // Create feed post about redemption (outside transaction, non-critical)
  try {
    await createFeedPost({
      userId,
      type: 'REWARD_REDEMPTION',
      rewardRedemptionId: redemption.id,
    })
  } catch {
    // Feed post failure should not break the redemption
  }

  return redemption
}

export async function getUserRedemptions(
  userId: string,
): Promise<RewardRedemptionWithRelations[]> {
  return prisma.rewardRedemption.findMany({
    where: { userId },
    include: {
      reward: {
        select: {
          id: true,
          title: true,
          imageUrl: true,
          category: true,
          pointsCost: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function markRedemptionUsed(
  redemptionId: string,
  adminId: string,
): Promise<void> {
  const redemption = await prisma.rewardRedemption.findUnique({
    where: { id: redemptionId },
  })

  if (!redemption) {
    throw new Error('Redemption not found')
  }

  if (redemption.status !== RedemptionStatus.PENDING) {
    throw new Error('Redemption is not in a pending state')
  }

  await prisma.rewardRedemption.update({
    where: { id: redemptionId },
    data: {
      status: RedemptionStatus.USED,
      usedAt: new Date(),
    },
  })

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'MARK_REDEMPTION_USED',
      entityType: 'RewardRedemption',
      entityId: redemptionId,
      details: `Marked redemption ${redemptionId} as used`,
    },
  })
}

export async function cancelRedemption(
  redemptionId: string,
  adminId: string,
): Promise<void> {
  const redemption = await prisma.rewardRedemption.findUnique({
    where: { id: redemptionId },
    include: { reward: true },
  })

  if (!redemption) {
    throw new Error('Redemption not found')
  }

  if (redemption.status !== RedemptionStatus.PENDING) {
    throw new Error('Only pending redemptions can be cancelled')
  }

  // Update redemption status and restore stock
  await prisma.$transaction(async (tx) => {
    await tx.rewardRedemption.update({
      where: { id: redemptionId },
      data: { status: RedemptionStatus.CANCELLED },
    })

    if (redemption.reward.stock >= 0) {
      await tx.reward.update({
        where: { id: redemption.rewardId },
        data: { stock: { increment: 1 } },
      })
    }
  })

  // Refund points outside transaction to avoid nesting
  await awardPoints(
    redemption.userId,
    redemption.pointsSpent,
    PointsSourceType.CUSTOM,
    redemptionId,
    `Refund for cancelled reward redemption: ${redemption.reward.title}`,
  )

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'CANCEL_REDEMPTION',
      entityType: 'RewardRedemption',
      entityId: redemptionId,
      details: `Cancelled redemption ${redemptionId} and refunded ${redemption.pointsSpent} points to user ${redemption.userId}`,
    },
  })
}

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

export async function createReward(
  data: CreateRewardInput,
  adminId: string,
): Promise<Reward> {
  const reward = await prisma.reward.create({
    data: {
      title: data.title,
      description: data.description,
      imageUrl: data.imageUrl,
      pointsCost: data.pointsCost,
      stock: data.stock ?? -1,
      category: data.category,
      isActive: data.isActive ?? true,
      expiresAt: data.expiresAt,
      centerId: data.centerId,
      sponsorId: data.sponsorId,
    },
  })

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'CREATE_REWARD',
      entityType: 'Reward',
      entityId: reward.id,
      details: `Created reward: ${reward.title}`,
    },
  })

  return reward
}

export async function updateReward(
  id: string,
  data: Partial<CreateRewardInput>,
  adminId: string,
): Promise<Reward> {
  const existing = await prisma.reward.findUnique({ where: { id } })

  if (!existing) {
    throw new Error('Reward not found')
  }

  const updated = await prisma.reward.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      ...(data.pointsCost !== undefined && { pointsCost: data.pointsCost }),
      ...(data.stock !== undefined && { stock: data.stock }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt }),
      ...(data.centerId !== undefined && { centerId: data.centerId }),
      ...(data.sponsorId !== undefined && { sponsorId: data.sponsorId }),
    },
  })

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'UPDATE_REWARD',
      entityType: 'Reward',
      entityId: id,
      details: `Updated reward: ${updated.title}`,
    },
  })

  return updated
}
