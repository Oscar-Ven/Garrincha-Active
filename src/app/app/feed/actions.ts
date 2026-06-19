'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'

export async function toggleKudos(postId: string): Promise<{ liked: boolean; count: number }> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const existing = await prisma.feedReaction.findUnique({
    where: { postId_userId: { postId, userId: user.id } },
  })

  if (existing) {
    await prisma.feedReaction.delete({ where: { postId_userId: { postId, userId: user.id } } })
  } else {
    await prisma.feedReaction.create({ data: { postId, userId: user.id, type: 'KUDOS' } })
    // Notify post author
    const post = await prisma.feedPost.findUnique({ where: { id: postId }, select: { userId: true } })
    if (post && post.userId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: post.userId,
          type: 'ACTIVITY_LIKED',
          title: 'Someone gave you kudos',
          body: `${user.name} gave kudos on your post`,
          linkUrl: '/app/feed',
        },
      })
    }
  }

  const count = await prisma.feedReaction.count({ where: { postId } })
  revalidatePath('/app/feed')
  return { liked: !existing, count }
}

export async function addComment(postId: string, content: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const trimmed = content.trim()
  if (!trimmed || trimmed.length > 500) return

  await prisma.feedComment.create({
    data: { postId, userId: user.id, content: trimmed },
  })

  // Notify post author
  const post = await prisma.feedPost.findUnique({ where: { id: postId }, select: { userId: true } })
  if (post && post.userId !== user.id) {
    await prisma.notification.create({
      data: {
        userId: post.userId,
        type: 'COMMENT_RECEIVED',
        title: 'New comment on your post',
        body: `${user.name}: ${trimmed.slice(0, 80)}`,
        linkUrl: '/app/feed',
      },
    })
  }

  revalidatePath('/app/feed')
}

export async function toggleFollow(targetUserId: string): Promise<{ following: boolean }> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.id === targetUserId) return { following: false }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: user.id, followingId: targetUserId } },
  })

  if (existing) {
    await prisma.follow.delete({
      where: { followerId_followingId: { followerId: user.id, followingId: targetUserId } },
    })
  } else {
    await prisma.follow.create({ data: { followerId: user.id, followingId: targetUserId } })
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: 'NEW_FOLLOWER',
        title: 'New follower',
        body: `${user.name} started following you`,
        linkUrl: `/app/players/${user.id}`,
      },
    })
  }

  revalidatePath('/app/feed')
  revalidatePath(`/app/players/${targetUserId}`)
  return { following: !existing }
}

export async function joinChallengeAction(challengeId: string): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  try {
    const existing = await prisma.challengeParticipant.findUnique({
      where: { challengeId_userId: { challengeId, userId: user.id } },
    })
    if (existing) return { success: true }

    await prisma.challengeParticipant.create({
      data: { challengeId, userId: user.id, progress: 0 },
    })

    revalidatePath('/app/challenges')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to join challenge' }
  }
}

export async function leaveChallengeAction(challengeId: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  await prisma.challengeParticipant.deleteMany({
    where: { challengeId, userId: user.id, isCompleted: false },
  })

  revalidatePath('/app/challenges')
}

export async function buyStreakShield(): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const SHIELD_COST = 50
  const profile = await prisma.playerProfile.findUnique({ where: { userId: user.id } })
  if (!profile) return { success: false, error: 'Profile not found' }
  if (profile.totalPoints < SHIELD_COST) return { success: false, error: 'Not enough points' }
  if (profile.streakShields >= 3) return { success: false, error: 'Maximum 3 shields' }

  await prisma.$transaction([
    prisma.playerProfile.update({
      where: { userId: user.id },
      data: { streakShields: { increment: 1 }, totalPoints: { decrement: SHIELD_COST } },
    }),
    prisma.pointsLedger.create({
      data: {
        userId: user.id,
        sourceType: 'REDEMPTION_DEBIT',
        points: -SHIELD_COST,
        reason: 'Purchased streak shield',
      },
    }),
  ])

  revalidatePath('/app/training')
  return { success: true }
}
