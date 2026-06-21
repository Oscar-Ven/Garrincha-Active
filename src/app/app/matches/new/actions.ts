'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { createMatch } from '@/services/matches'
import { ActivityType, MatchFormat, MatchSurface } from '@/generated/prisma'
import { ApiError } from '@/lib/api-error'

const setSchema = z.object({
  homeGames: z.coerce.number().int().min(0),
  awayGames: z.coerce.number().int().min(0),
  homeTiebreak: z.coerce.number().int().min(0).optional().nullable(),
  awayTiebreak: z.coerce.number().int().min(0).optional().nullable(),
})

const createMatchSchema = z.object({
  sport: z.nativeEnum(ActivityType),
  format: z.nativeEnum(MatchFormat),
  bestOf: z.coerce.number().refine((v) => v === 3 || v === 5, { message: 'Must be 3 or 5' }),
  surface: z.nativeEnum(MatchSurface).optional(),
  courtId: z.string().optional(),
  playedAt: z.string().optional(),
  notes: z.string().max(500).optional(),
  awayUserId: z.string().min(1, 'Opponent is required'),
  homePartnerUserId: z.string().optional(),
  awayPartnerUserId: z.string().optional(),
  sets: z.array(setSchema).min(1, 'At least one set is required'),
})

export type CreateMatchFormState = {
  errors?: Partial<Record<string, string[]>> & { _form?: string[] }
  success?: boolean
}

export async function createMatchAction(
  _prev: CreateMatchFormState,
  formData: FormData,
): Promise<CreateMatchFormState> {
  const user = await getCurrentUser()
  if (!user) return { errors: { _form: ['You must be logged in'] } }

  // Parse sets from form data (sets[0][homeGames], sets[0][awayGames], ...)
  const rawSets: Array<{ homeGames: unknown; awayGames: unknown; homeTiebreak?: unknown; awayTiebreak?: unknown }> = []
  const setsCountStr = formData.get('setsCount')
  const setsCount = parseInt(String(setsCountStr ?? '0'), 10)

  for (let i = 0; i < setsCount; i++) {
    rawSets.push({
      homeGames: formData.get(`sets[${i}][homeGames]`),
      awayGames: formData.get(`sets[${i}][awayGames]`),
      homeTiebreak: formData.get(`sets[${i}][homeTiebreak]`) || undefined,
      awayTiebreak: formData.get(`sets[${i}][awayTiebreak]`) || undefined,
    })
  }

  const raw = {
    sport: formData.get('sport'),
    format: formData.get('format'),
    bestOf: formData.get('bestOf'),
    surface: formData.get('surface') || undefined,
    courtId: formData.get('courtId') || undefined,
    playedAt: formData.get('playedAt') || undefined,
    notes: formData.get('notes') || undefined,
    awayUserId: formData.get('awayUserId'),
    homePartnerUserId: formData.get('homePartnerUserId') || undefined,
    awayPartnerUserId: formData.get('awayPartnerUserId') || undefined,
    sets: rawSets,
  }

  const parsed = createMatchSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  if (parsed.data.awayUserId === user.id) {
    return { errors: { awayUserId: ['Cannot record a match against yourself'] } }
  }

  if (parsed.data.format === MatchFormat.DOUBLES) {
    if (!parsed.data.homePartnerUserId) {
      return { errors: { homePartnerUserId: ['Your partner is required for doubles'] } }
    }
    if (!parsed.data.awayPartnerUserId) {
      return { errors: { awayPartnerUserId: ["Opponent's partner is required for doubles"] } }
    }
  }

  try {
    const match = await createMatch({
      sport: parsed.data.sport,
      format: parsed.data.format,
      bestOf: parsed.data.bestOf as 3 | 5,
      surface: parsed.data.surface,
      courtId: parsed.data.courtId,
      playedAt: parsed.data.playedAt ? new Date(parsed.data.playedAt) : undefined,
      notes: parsed.data.notes,
      sets: parsed.data.sets,
      homeUserId: user.id,
      awayUserId: parsed.data.awayUserId,
      homePartnerUserId: parsed.data.homePartnerUserId,
      awayPartnerUserId: parsed.data.awayPartnerUserId,
    })

    redirect(`/app/matches/${match.id}`)
  } catch (err) {
    if (err instanceof ApiError) {
      return { errors: { _form: [err.message] } }
    }
    // redirect throws — rethrow it
    throw err
  }
}
