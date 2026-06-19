import { prisma } from '@/lib/db'
import { GearType } from '@/generated/prisma'

type CreateGearInput = {
  name: string
  type: GearType
  brand?: string
  model?: string
  alertThresholdKm?: number
  purchasedAt?: Date
  notes?: string
}

export async function createGear(userId: string, data: CreateGearInput) {
  return prisma.gear.create({
    data: {
      userId,
      name: data.name,
      type: data.type,
      brand: data.brand ?? null,
      model: data.model ?? null,
      alertThresholdKm: data.alertThresholdKm ?? null,
      purchasedAt: data.purchasedAt ?? null,
      notes: data.notes ?? null,
    },
  })
}

export async function getUserGear(userId: string) {
  return prisma.gear.findMany({
    where: { userId },
    include: {
      _count: { select: { activities: true } },
    },
    orderBy: [{ isRetired: 'asc' }, { createdAt: 'desc' }],
  })
}

export async function getGear(gearId: string, userId: string) {
  return prisma.gear.findFirst({
    where: { id: gearId, userId },
    include: {
      activities: {
        where: { status: 'APPROVED' },
        orderBy: { startedAt: 'desc' },
        take: 10,
        select: { id: true, title: true, type: true, distanceKm: true, startedAt: true },
      },
      _count: { select: { activities: true } },
    },
  })
}

export async function retireGear(gearId: string, userId: string) {
  return prisma.gear.updateMany({
    where: { id: gearId, userId },
    data: { isRetired: true },
  })
}

export async function unretireGear(gearId: string, userId: string) {
  return prisma.gear.updateMany({
    where: { id: gearId, userId },
    data: { isRetired: false },
  })
}

export async function deleteGear(gearId: string, userId: string) {
  return prisma.gear.deleteMany({ where: { id: gearId, userId } })
}

export async function updateGearDistance(gearId: string, additionalKm: number) {
  const gear = await prisma.gear.findUnique({
    where: { id: gearId },
    select: { userId: true, totalDistanceKm: true, alertThresholdKm: true },
  })
  if (!gear) return null

  const prevTotal = gear.totalDistanceKm ?? 0
  const newTotal = prevTotal + additionalKm

  const updated = await prisma.gear.update({
    where: { id: gearId },
    data: { totalDistanceKm: newTotal },
  })

  // Fire GEAR_ALERT notification when threshold is crossed for the first time
  if (
    gear.alertThresholdKm != null &&
    prevTotal < gear.alertThresholdKm &&
    newTotal >= gear.alertThresholdKm
  ) {
    await prisma.notification.create({
      data: {
        userId: gear.userId,
        type: 'GEAR_ALERT',
        title: 'Gear maintenance reminder',
        body: `Your gear has reached ${gear.alertThresholdKm.toFixed(0)} km. Time for a check-up!`,
        linkUrl: `/app/gear`,
      },
    })
  }

  return updated
}
