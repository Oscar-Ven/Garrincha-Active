import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ActivityType } from '@/generated/prisma'

// Map Strava activity types to our ActivityType enum
function mapStravaType(stravaType: string): ActivityType {
  const map: Record<string, ActivityType> = {
    Run: ActivityType.RUN,
    VirtualRun: ActivityType.RUN,
    Walk: ActivityType.WALK,
    Hike: ActivityType.WALK,
    Ride: ActivityType.CYCLING,
    VirtualRide: ActivityType.CYCLING,
    EBikeRide: ActivityType.CYCLING,
    Workout: ActivityType.FITNESS,
    WeightTraining: ActivityType.FITNESS,
    Yoga: ActivityType.FITNESS,
    Soccer: ActivityType.FOOTBALL_TRAINING,
    Football: ActivityType.FOOTBALL_TRAINING,
  }
  return map[stravaType] ?? ActivityType.CUSTOM
}

interface StravaActivity {
  id: number
  name: string
  type: string
  sport_type: string
  start_date: string
  moving_time: number
  distance: number
  total_elevation_gain?: number
  average_heartrate?: number
}

async function refreshStravaToken(oauthAccountId: string, refreshToken: string) {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json() as {
    access_token?: string
    refresh_token?: string
    expires_at?: number
  }

  if (!data.access_token) {
    throw new Error('Failed to refresh Strava token')
  }

  await prisma.oAuthAccount.update({
    where: { id: oauthAccountId },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? undefined,
      expiresAt: data.expires_at ? new Date(data.expires_at * 1000) : undefined,
    },
  })

  return data.access_token
}

export async function POST() {
  const session = await getCurrentUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find Strava OAuth account for this user
  const stravaAccount = await prisma.oAuthAccount.findFirst({
    where: { userId: session.id, provider: 'strava' },
  })

  if (!stravaAccount || !stravaAccount.accessToken) {
    return NextResponse.json(
      { error: 'Strava not connected. Please connect your Strava account first.' },
      { status: 400 },
    )
  }

  // Refresh token if expired (or about to expire within 60 seconds)
  let accessToken = stravaAccount.accessToken
  const isExpired =
    stravaAccount.expiresAt && stravaAccount.expiresAt.getTime() < Date.now() + 60_000

  if (isExpired && stravaAccount.refreshToken) {
    try {
      accessToken = await refreshStravaToken(stravaAccount.id, stravaAccount.refreshToken)
    } catch {
      return NextResponse.json(
        { error: 'Strava token refresh failed. Please reconnect your Strava account.' },
        { status: 400 },
      )
    }
  }

  // Fetch recent activities from Strava
  const activitiesRes = await fetch(
    'https://www.strava.com/api/v3/athlete/activities?per_page=30',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!activitiesRes.ok) {
    return NextResponse.json(
      { error: 'Failed to fetch activities from Strava.' },
      { status: 502 },
    )
  }

  const stravaActivities: StravaActivity[] = await activitiesRes.json()

  if (!Array.isArray(stravaActivities)) {
    return NextResponse.json({ error: 'Unexpected response from Strava.' }, { status: 502 })
  }

  let imported = 0
  let skipped = 0

  for (const sa of stravaActivities) {
    const stravaActivityId = sa.id.toString()

    // Skip if already imported
    const existing = await prisma.activity.findUnique({
      where: { stravaActivityId },
    })
    if (existing) {
      skipped++
      continue
    }

    const durationMinutes = Math.max(1, Math.round(sa.moving_time / 60))
    const distanceKm = sa.distance > 0 ? sa.distance / 1000 : null

    await prisma.activity.create({
      data: {
        userId: session.id,
        title: sa.name || 'Strava Activity',
        type: mapStravaType(sa.sport_type ?? sa.type),
        startedAt: new Date(sa.start_date),
        durationMinutes,
        distanceKm,
        elevationGainM: sa.total_elevation_gain ?? null,
        heartRateAvg: sa.average_heartrate ? Math.round(sa.average_heartrate) : null,
        stravaActivityId,
        status: 'APPROVED',
        pointsEarned: 0,
      },
    })
    imported++
  }

  return NextResponse.json({ imported, skipped })
}
