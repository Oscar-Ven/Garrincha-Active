import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ActivityType } from '@/generated/prisma'
import { createActivity } from '@/services/activities'
import { estimateCalories } from '@/lib/calorie-calc'
import { catchApiError } from '@/lib/api-error'

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const TYPE_LABEL: Record<ActivityType, string> = {
  RUN: 'Run',
  WALK: 'Walk',
  CYCLING: 'Cycling',
  FOOTBALL_TRAINING: 'Football Training',
  FOOTBALL_MATCH: 'Football Match',
  FITNESS: 'Fitness',
  CUSTOM: 'Activity',
  PADEL: 'Padel',
  TENNIS: 'Tennis',
  SQUASH: 'Squash',
  PICKLEBALL: 'Pickleball',
  BADMINTON: 'Badminton',
  RACQUETBALL: 'Racquetball',
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const session = await prisma.liveTrackingSession.findFirst({
      where: { id, userId: user.id, isActive: true },
      select: { id: true, type: true, startedAt: true },
    })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const body = await req.json()
    const activityType: ActivityType = body.type ?? session.type

    // Get all GPS points ordered by sequence
    const trackingPoints = await prisma.trackingPoint.findMany({
      where: { sessionId: id },
      orderBy: { sequence: 'asc' },
      select: { lat: true, lng: true, alt: true, speed: true, heartRate: true, cadence: true, timestamp: true, sequence: true },
    })

    // Calculate total distance
    let distanceKm = 0
    for (let i = 1; i < trackingPoints.length; i++) {
      const prev = trackingPoints[i - 1]
      const curr = trackingPoints[i]
      const d = haversineKm(prev.lat, prev.lng, curr.lat, curr.lng)
      if (d < 0.5) distanceKm += d // skip GPS jumps > 500m
    }

    const now = new Date()
    const durationMs = now.getTime() - session.startedAt.getTime()
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000))

    const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    const title = body.title?.trim() || `${TYPE_LABEL[activityType]} — ${dateStr}`

    const DISTANCE_BASED = new Set<string>([ActivityType.RUN, ActivityType.WALK, ActivityType.CYCLING])
    const isDistanceBased = DISTANCE_BASED.has(activityType)

    const activity = await createActivity(user.id, {
      title,
      type: activityType,
      startedAt: session.startedAt,
      durationMinutes,
      distanceKm: isDistanceBased && distanceKm > 0 ? distanceKm : undefined,
      caloriesBurned: estimateCalories(activityType, durationMinutes),
    })

    // Copy TrackingPoints → ActivityRoutePoints
    if (trackingPoints.length > 0) {
      await prisma.activityRoutePoint.createMany({
        data: trackingPoints.map((p, i) => ({
          activityId: activity.id,
          latitude: p.lat,
          longitude: p.lng,
          altitude: p.alt ?? null,
          speed: p.speed ?? null,
          heartRate: p.heartRate ?? null,
          cadence: p.cadence ?? null,
          timestamp: p.timestamp,
          sequence: i + 1,
        })),
      })
    }

    // Mark session as finished
    await prisma.liveTrackingSession.update({
      where: { id },
      data: { isActive: false, endedAt: now, activityId: activity.id },
    })

    return NextResponse.json({ activityId: activity.id })
  } catch (err) {
    return catchApiError(err)
  }
}
