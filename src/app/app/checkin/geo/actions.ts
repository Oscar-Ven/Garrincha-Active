'use server'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { awardPoints } from '@/services/points'
import { PointsSourceType } from '@/generated/prisma'
import { checkinRatelimit } from '@/lib/redis'

const CHECK_IN_POINTS = 50

function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export type NearbyCenterResult = {
  id: string
  name: string
  city: string | null
  checkInRadiusM: number
  distanceM: number
}

export async function findNearbyCenter(lat: number, lng: number): Promise<NearbyCenterResult[]> {
  const centers = await prisma.center.findMany({
    where: { isActive: true, latitude: { not: null }, longitude: { not: null } },
    select: { id: true, name: true, city: true, latitude: true, longitude: true, checkInRadiusM: true },
  })

  return centers
    .map((c) => {
      const dist = haversineMetres(lat, lng, c.latitude!, c.longitude!)
      return { id: c.id, name: c.name, city: c.city, checkInRadiusM: c.checkInRadiusM, distanceM: Math.round(dist) }
    })
    .filter((c) => c.distanceM <= c.checkInRadiusM)
    .sort((a, b) => a.distanceM - b.distanceM)
}

export type GeoCheckInResult =
  | { ok: true; pointsAwarded: number; centerName: string }
  | { ok: false; reason: 'UNAUTHENTICATED' | 'CENTER_NOT_FOUND' | 'OUT_OF_RANGE' | 'COOLDOWN' | 'NO_PROFILE' }

export async function geoCheckIn(centerId: string, lat: number, lng: number): Promise<GeoCheckInResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, reason: 'UNAUTHENTICATED' }

  if (checkinRatelimit) {
    const { success } = await checkinRatelimit.limit(user.id)
    if (!success) return { ok: false, reason: 'COOLDOWN' }
  }

  // Re-verify center and distance server-side
  const center = await prisma.center.findUnique({
    where: { id: centerId, isActive: true },
    select: { id: true, name: true, latitude: true, longitude: true, checkInRadiusM: true },
  })
  if (!center || center.latitude == null || center.longitude == null) {
    return { ok: false, reason: 'CENTER_NOT_FOUND' }
  }

  const dist = haversineMetres(lat, lng, center.latitude, center.longitude)
  if (Math.round(dist) > center.checkInRadiusM) {
    return { ok: false, reason: 'OUT_OF_RANGE' }
  }

  // Daily limit: one check-in per center per calendar day
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const existing = await prisma.venueCheckIn.findFirst({
    where: { userId: user.id, centerId, checkedInAt: { gte: dayStart } },
  })
  if (existing) return { ok: false, reason: 'COOLDOWN' }

  const profile = await prisma.playerProfile.findUnique({ where: { userId: user.id }, select: { id: true } })
  if (!profile) return { ok: false, reason: 'NO_PROFILE' }

  // Find or create a sentinel QR for geo check-ins at this center
  const geoToken = `geo-${centerId}`
  const geoQr = await prisma.centerQR.upsert({
    where: { token: geoToken },
    create: { centerId, token: geoToken, label: 'Geo Check-in', isActive: true, createdById: user.id },
    update: {},
  })

  await prisma.$transaction(async (tx) => {
    await tx.venueCheckIn.create({
      data: { userId: user.id, centerId, qrId: geoQr.id, pointsAwarded: CHECK_IN_POINTS },
    })
    await tx.notification.create({
      data: {
        userId: user.id,
        type: 'VENUE_CHECK_IN',
        title: `Checked in at ${center.name}`,
        body: `You earned ${CHECK_IN_POINTS} points for checking in today via GPS!`,
        linkUrl: `/app/wallet`,
      },
    })
  })

  await awardPoints(user.id, CHECK_IN_POINTS, PointsSourceType.VENUE_CHECK_IN, geoQr.id, `GPS check-in at ${center.name}`)

  return { ok: true, pointsAwarded: CHECK_IN_POINTS, centerName: center.name }
}
