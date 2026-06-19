import { prisma } from '@/lib/db'
import { awardPoints } from './points'
import { PointsSourceType } from '@/generated/prisma'

const CHECK_IN_POINTS = 50

export async function createCenterQR(centerId: string, createdById: string, label?: string) {
  return prisma.centerQR.create({
    data: { centerId, createdById, label: label ?? null, isActive: true },
  })
}

export async function getCenterQRCodes(centerId: string) {
  return prisma.centerQR.findMany({
    where: { centerId },
    include: { _count: { select: { checkIns: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getCenterCheckIns(centerId: string, limit = 50) {
  return prisma.venueCheckIn.findMany({
    where: { centerId },
    include: { user: { select: { id: true, name: true, nickname: true } } },
    orderBy: { checkedInAt: 'desc' },
    take: limit,
  })
}

export type CheckInResult =
  | { ok: true; pointsAwarded: number; centerName: string }
  | { ok: false; reason: 'NOT_FOUND' | 'EXPIRED' | 'INACTIVE' | 'COOLDOWN' | 'NO_PROFILE' }

export async function performCheckIn(userId: string, token: string): Promise<CheckInResult> {
  const qr = await prisma.centerQR.findUnique({
    where: { token },
    include: { center: { select: { id: true, name: true } } },
  })

  if (!qr) return { ok: false, reason: 'NOT_FOUND' }
  if (!qr.isActive) return { ok: false, reason: 'INACTIVE' }
  if (qr.expiresAt && qr.expiresAt < new Date()) return { ok: false, reason: 'EXPIRED' }

  // 1 check-in per center per calendar day
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const existing = await prisma.venueCheckIn.findFirst({
    where: { userId, centerId: qr.centerId, checkedInAt: { gte: dayStart } },
  })
  if (existing) return { ok: false, reason: 'COOLDOWN' }

  const profile = await prisma.playerProfile.findUnique({ where: { userId }, select: { id: true } })
  if (!profile) return { ok: false, reason: 'NO_PROFILE' }

  await prisma.$transaction(async (tx) => {
    await tx.venueCheckIn.create({
      data: { userId, centerId: qr.centerId, qrId: qr.id, pointsAwarded: CHECK_IN_POINTS },
    })
    await tx.notification.create({
      data: {
        userId,
        type: 'VENUE_CHECK_IN',
        title: `Checked in at ${qr.center.name}`,
        body: `You earned ${CHECK_IN_POINTS} points for checking in today!`,
        linkUrl: `/app/wallet`,
      },
    })
  })

  await awardPoints(userId, CHECK_IN_POINTS, PointsSourceType.VENUE_CHECK_IN, qr.id, `Check-in at ${qr.center.name}`)

  return { ok: true, pointsAwarded: CHECK_IN_POINTS, centerName: qr.center.name }
}
