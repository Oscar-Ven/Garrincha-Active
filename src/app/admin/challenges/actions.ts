'use server'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { ChallengeType } from '@/generated/prisma'

const VALID_CHALLENGE_TYPES = new Set<string>([
  'DISTANCE',
  'ACTIVE_MINUTES',
  'ACTIVITY_COUNT',
  'FOOTBALL_TRAINING_ATTENDANCE',
  'MATCH_COUNT',
  'POINTS',
  'CENTER_VS_CENTER',
  'TEAM',
])

export async function createChallengeAction(
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const session = await getCurrentUser()
  if (!session) redirect('/login')
  if (session.role !== 'PLATFORM_ADMIN' && session.role !== 'CENTER_ADMIN') {
    return { error: 'Unauthorized.' }
  }

  const title = (formData.get('title') as string | null)?.trim()
  const description = (formData.get('description') as string | null)?.trim()
  const type = (formData.get('type') as string | null)?.trim()
  const startDateStr = formData.get('startDate') as string | null
  const endDateStr = formData.get('endDate') as string | null
  const targetValueStr = formData.get('targetValue') as string | null
  const pointsRewardStr = formData.get('pointsReward') as string | null
  const imageUrl = (formData.get('imageUrl') as string | null)?.trim() || null

  if (!title) return { error: 'Title is required.' }
  if (!description) return { error: 'Description is required.' }
  if (!type || !VALID_CHALLENGE_TYPES.has(type)) return { error: 'A valid challenge type is required.' }
  if (!startDateStr) return { error: 'Start date is required.' }
  if (!endDateStr) return { error: 'End date is required.' }

  const startDate = new Date(startDateStr)
  const endDate = new Date(endDateStr)

  if (isNaN(startDate.getTime())) return { error: 'Invalid start date.' }
  if (isNaN(endDate.getTime())) return { error: 'Invalid end date.' }
  if (endDate <= startDate) return { error: 'End date must be after start date.' }

  const targetValue = parseFloat(targetValueStr ?? '')
  if (isNaN(targetValue) || targetValue <= 0) return { error: 'Target value must be a positive number.' }

  const pointsReward = parseInt(pointsRewardStr ?? '', 10)
  if (isNaN(pointsReward) || pointsReward < 1) return { error: 'Points reward must be at least 1.' }

  // CENTER_ADMIN challenges are scoped to their center
  const centerId =
    session.role === 'CENTER_ADMIN'
      ? (await prisma.user.findUnique({ where: { id: session.id }, select: { centerId: true } }))
          ?.centerId ?? null
      : null

  await prisma.challenge.create({
    data: {
      title,
      description,
      type: type as ChallengeType,
      startDate,
      endDate,
      targetValue,
      pointsReward,
      imageUrl,
      isActive: true,
      centerId,
    },
  })

  revalidatePath('/admin/challenges')
}
