'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { createActivity } from '@/services/activities'
import { prisma } from '@/lib/db'
import { ActivityType } from '@/generated/prisma'

const schema = z.object({
  title: z.string().min(1, 'Title required').max(100),
  type: z.nativeEnum(ActivityType),
  startedAt: z.string().min(1, 'Date required'),
  durationMinutes: z.coerce.number().int().min(1).max(1440),
  distanceKm: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().positive().max(1000).optional(),
  ),
  heartRateAvg: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().int().min(0).max(250).optional(),
  ),
  cadence: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().int().min(0).max(250).optional(),
  ),
  temperature: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number().min(-30).max(60).optional(),
  ),
  description: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().max(500).optional(),
  ),
})

export type ImportGPXState = { error?: string }

export async function importGPXAction(
  _prev: ImportGPXState,
  formData: FormData,
): Promise<ImportGPXState> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const parsed = schema.safeParse({
    title: formData.get('title'),
    type: formData.get('type'),
    startedAt: formData.get('startedAt'),
    durationMinutes: formData.get('durationMinutes'),
    distanceKm: formData.get('distanceKm'),
    heartRateAvg: formData.get('heartRateAvg'),
    cadence: formData.get('cadence'),
    temperature: formData.get('temperature'),
    description: formData.get('description'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid data' }
  }

  const d = parsed.data
  // Parse route points
  type RawPoint = { lat: number; lng: number; alt: number | null; time: string | null }
  let routePoints: RawPoint[] = []
  try {
    const raw = formData.get('routePointsJson')
    if (typeof raw === 'string' && raw.length > 2) {
      routePoints = JSON.parse(raw) as RawPoint[]
    }
  } catch {
    // non-fatal — activity still imports without route
  }

  let activityId: string

  try {
    const activity = await createActivity(user.id, {
      title: d.title,
      type: d.type,
      startedAt: new Date(d.startedAt),
      durationMinutes: d.durationMinutes,
      distanceKm: d.distanceKm,
      description: d.description ?? 'Imported from GPX file',
      heartRateAvg: d.heartRateAvg,
      cadence: d.cadence,
      temperature: d.temperature,
    })
    activityId = activity.id

    // Save route points if present
    if (routePoints.length >= 2) {
      const fallbackTime = new Date(d.startedAt)
      await prisma.activityRoutePoint.createMany({
        data: routePoints.map((pt, i) => ({
          activityId,
          latitude: pt.lat,
          longitude: pt.lng,
          altitude: pt.alt ?? undefined,
          timestamp: pt.time ? new Date(pt.time) : fallbackTime,
          sequence: i + 1,
        })),
      })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Import failed. Please try again.'
    return { error: msg }
  }

  redirect(`/app/activities/${activityId}`)
}
