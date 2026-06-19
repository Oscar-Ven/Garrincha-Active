'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { EventStatus, EventType } from '@/generated/prisma'

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'PLATFORM_ADMIN' && user.role !== 'CENTER_ADMIN') redirect('/app')
  return user
}

export async function createEventAction(formData: FormData) {
  const admin = await requireAdmin()

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const type = formData.get('type') as EventType
  const status = (formData.get('status') as EventStatus) ?? EventStatus.DRAFT
  // CENTER_ADMIN is scoped to their own center — look it up, ignore submitted centerId
  let centerId: string | null = (formData.get('centerId') as string) || null
  if (admin.role === 'CENTER_ADMIN') {
    const adminUser = await prisma.user.findUnique({ where: { id: admin.id }, select: { centerId: true } })
    centerId = adminUser?.centerId ?? null
  }
  const location = (formData.get('location') as string) || null
  const startDateRaw = formData.get('startDate') as string
  const endDateRaw = formData.get('endDate') as string
  const capacityRaw = formData.get('capacity') as string
  const pointsRewardRaw = formData.get('pointsReward') as string
  const imageUrl = (formData.get('imageUrl') as string) || null
  const isTournament = formData.get('isTournament') === 'true'

  if (!title?.trim()) throw new Error('Title is required')
  if (!description?.trim()) throw new Error('Description is required')
  if (!type) throw new Error('Type is required')
  if (!startDateRaw) throw new Error('Start date is required')
  if (!endDateRaw) throw new Error('End date is required')

  const startDate = new Date(startDateRaw)
  const endDate = new Date(endDateRaw)
  if (endDate <= startDate) throw new Error('End date must be after start date')

  const capacity = capacityRaw ? parseInt(capacityRaw, 10) : null
  const pointsReward = pointsRewardRaw ? parseInt(pointsRewardRaw, 10) : 0

  const event = await prisma.event.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      type,
      status,
      centerId,
      location,
      startDate,
      endDate,
      capacity,
      pointsReward,
      imageUrl,
      isTournament,
    },
  })

  await prisma.adminAuditLog.create({
    data: {
      adminId: admin.id,
      action: 'CREATE_EVENT',
      entityType: 'Event',
      entityId: event.id,
      details: JSON.stringify({ title: event.title, type: event.type, status: event.status }),
    },
  })

  revalidatePath('/admin/events')
}

export async function updateEventStatusAction(eventId: string, newStatus: EventStatus) {
  const admin = await requireAdmin()

  const existing = await prisma.event.findUnique({ where: { id: eventId } })
  if (!existing) throw new Error('Event not found')

  if (admin.role === 'CENTER_ADMIN') {
    const adminUser = await prisma.user.findUnique({ where: { id: admin.id }, select: { centerId: true } })
    if (existing.centerId !== adminUser?.centerId) throw new Error('Unauthorized: event belongs to a different center')
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { status: newStatus },
  })

  await prisma.adminAuditLog.create({
    data: {
      adminId: admin.id,
      action: 'UPDATE_EVENT_STATUS',
      entityType: 'Event',
      entityId: eventId,
      details: JSON.stringify({ from: existing.status, to: newStatus }),
    },
  })

  revalidatePath('/admin/events')
}

export async function markAttendanceAction(eventId: string, userId: string) {
  const admin = await requireAdmin()

  const registration = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId, userId } },
    include: { event: true },
  })

  if (!registration) throw new Error('Registration not found')
  if (registration.attended) throw new Error('Attendance already marked')

  await prisma.eventRegistration.update({
    where: { eventId_userId: { eventId, userId } },
    data: { attended: true, attendedAt: new Date() },
  })

  if (registration.event.pointsReward > 0) {
    const { awardPoints } = await import('@/services/points')
    const { PointsSourceType } = await import('@/generated/prisma')
    await awardPoints(
      userId,
      registration.event.pointsReward,
      PointsSourceType.EVENT_ATTENDANCE,
      eventId,
      `Attended event: ${registration.event.title}`,
    )
  }

  await prisma.adminAuditLog.create({
    data: {
      adminId: admin.id,
      action: 'MARK_EVENT_ATTENDANCE',
      entityType: 'EventRegistration',
      entityId: registration.id,
      details: JSON.stringify({ eventId, userId }),
    },
  })

  revalidatePath('/admin/events')
}
