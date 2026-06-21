'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { createActivity } from '@/services/activities'
import { estimateCalories } from '@/lib/calorie-calc'
import { eloUpdate } from '@/lib/elo'
import { uploadActivityMedia } from '@/services/upload-service'
import { ActivityType, ActivityVisibility } from '@/generated/prisma'
import { prisma } from '@/lib/db'
import { syncHashtags } from '@/lib/hashtags'

const optionalInt = (max?: number) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(0).max(max ?? 99999).optional(),
  )

const createActivitySchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  type: z.nativeEnum(ActivityType),
  startedAt: z.string().min(1, 'Date is required'),
  durationMinutes: z.coerce
    .number({ error: 'Duration must be a number' })
    .int()
    .min(1, 'Duration must be at least 1 minute')
    .max(1440, 'Duration cannot exceed 24 hours'),
  distanceKm: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.coerce.number().positive('Distance must be positive').max(1000).optional(),
  ),
  description: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().max(500, 'Description is too long').optional(),
  ),
  visibility: z.nativeEnum(ActivityVisibility).default(ActivityVisibility.PUBLIC),
  gear: z.preprocess((v) => (v === '' ? undefined : v), z.string().max(100).optional()),
  effortLevel: optionalInt(10),
  heartRateAvg: optionalInt(250),
  heartRateMax: optionalInt(250),
  cadence: optionalInt(250),
  powerWatts: optionalInt(3000),
  temperature: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(-30).max(60).optional(),
  ),
})

export type CreateActivityFormState = {
  success: false
  fieldErrors: Partial<Record<string, string>>
  serverError: string | null
} | {
  success: true
  pointsEarned: number
}

export async function createActivityAction(
  _prev: CreateActivityFormState,
  formData: FormData,
): Promise<CreateActivityFormState> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const raw = {
    title: formData.get('title'),
    type: formData.get('type'),
    startedAt: formData.get('startedAt'),
    durationMinutes: formData.get('durationMinutes'),
    distanceKm: formData.get('distanceKm'),
    description: formData.get('description'),
    visibility: formData.get('visibility'),
    gear: formData.get('gear'),
    effortLevel: formData.get('effortLevel'),
    heartRateAvg: formData.get('heartRateAvg'),
    heartRateMax: formData.get('heartRateMax'),
    cadence: formData.get('cadence'),
    powerWatts: formData.get('powerWatts'),
    temperature: formData.get('temperature'),
  }

  const result = createActivitySchema.safeParse(raw)

  if (!result.success) {
    const fieldErrors: Partial<Record<string, string>> = {}
    for (const issue of result.error.issues) {
      const key = issue.path[0] as string
      if (!fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { success: false, fieldErrors, serverError: null }
  }

  const parsed = result.data

  let activity
  try {
    activity = await createActivity(user.id, {
      title: parsed.title,
      type: parsed.type,
      startedAt: new Date(parsed.startedAt),
      durationMinutes: parsed.durationMinutes,
      distanceKm: parsed.distanceKm,
      description: parsed.description,
      visibility: parsed.visibility,
      gear: parsed.gear,
      effortLevel: parsed.effortLevel,
      heartRateAvg: parsed.heartRateAvg,
      heartRateMax: parsed.heartRateMax,
      cadence: parsed.cadence,
      powerWatts: parsed.powerWatts,
      temperature: parsed.temperature,
      caloriesBurned: estimateCalories(parsed.type, parsed.durationMinutes),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
    return { success: false, fieldErrors: {}, serverError: message }
  }

  // Sync hashtags from title + description (non-blocking)
  try {
    const hashtagText = `${activity.title} ${activity.description ?? ''}`
    await syncHashtags(prisma, 'activity', activity.id, hashtagText)
  } catch (hashtagErr) {
    console.warn('[createActivity] Failed to sync hashtags:', hashtagErr)
  }

  // Upload photos (non-blocking — activity is already created)
  const photos = formData.getAll('photos') as File[]
  const validPhotos = photos.filter((f) => f instanceof File && f.size > 0)
  if (validPhotos.length > 0) {
    await Promise.allSettled(
      validPhotos.slice(0, 5).map((f) => uploadActivityMedia(user.id, activity.id, f)),
    )
  }

  // Elo update for football matches (non-blocking, best-effort)
  const opponentEmail = formData.get('opponentEmail') as string | null
  const matchOutcome = formData.get('matchOutcome') as string | null
  if (parsed.type === ActivityType.FOOTBALL_MATCH && opponentEmail && matchOutcome && ['win','draw','loss'].includes(matchOutcome)) {
    try {
      const opponent = await prisma.user.findUnique({ where: { email: opponentEmail }, select: { id: true } })
      if (opponent && opponent.id !== user.id) {
        const [myP, theirP] = await Promise.all([
          prisma.playerProfile.findUnique({ where: { userId: user.id }, select: { eloRating: true } }),
          prisma.playerProfile.findUnique({ where: { userId: opponent.id }, select: { eloRating: true } }),
        ])
        const { newA, newB } = eloUpdate(myP?.eloRating ?? 1000, theirP?.eloRating ?? 1000, matchOutcome as 'win'|'draw'|'loss')
        await Promise.all([
          prisma.playerProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, eloRating: newA }, update: { eloRating: newA } }),
          prisma.playerProfile.upsert({ where: { userId: opponent.id }, create: { userId: opponent.id, eloRating: newB }, update: { eloRating: newB } }),
        ])
      }
    } catch { /* non-critical */ }
  }

  return { success: true, pointsEarned: activity.pointsEarned }
}
