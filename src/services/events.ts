import { prisma } from '@/lib/db'
import { awardPoints } from '@/services/points'
import { createFeedPost } from '@/services/feed'
import { EventType, EventStatus, PointsSourceType } from '@/generated/prisma'
import type { Event, EventRegistration } from '@/generated/prisma'

export interface CreateEventInput {
  title: string
  description: string
  type: EventType
  status?: EventStatus
  centerId?: string
  location?: string
  startDate: Date
  endDate: Date
  capacity?: number
  pointsReward?: number
  imageUrl?: string
  isTournament?: boolean
}

export async function getEvents(options?: {
  type?: EventType
  status?: EventStatus
  centerId?: string
  upcoming?: boolean
}): Promise<Event[]> {
  const where: Record<string, unknown> = {}

  if (options?.type) {
    where.type = options.type
  }

  if (options?.status) {
    where.status = options.status
  }

  if (options?.centerId) {
    where.centerId = options.centerId
  }

  if (options?.upcoming) {
    where.startDate = { gte: new Date() }
  }

  return prisma.event.findMany({
    where,
    orderBy: { startDate: 'asc' },
    include: {
      center: true,
      _count: {
        select: { registrations: true },
      },
    },
  })
}

export async function getEventById(
  id: string
): Promise<
  Event & {
    center: unknown
    registrations: EventRegistration[]
    _count: { registrations: number }
  }
> {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      center: true,
      registrations: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              nickname: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { registeredAt: 'desc' },
      },
      _count: {
        select: { registrations: true },
      },
    },
  })

  if (!event) {
    throw new Error(`Event not found: ${id}`)
  }

  return event as Event & {
    center: unknown
    registrations: EventRegistration[]
    _count: { registrations: number }
  }
}

export async function registerForEvent(
  userId: string,
  eventId: string
): Promise<EventRegistration> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      _count: { select: { registrations: true } },
    },
  })

  if (!event) {
    throw new Error('Event not found')
  }

  if (event.status !== EventStatus.PUBLISHED) {
    throw new Error('Event is not open for registration')
  }

  if (event.capacity !== null && event.capacity !== undefined) {
    const registrationCount = (event as typeof event & { _count: { registrations: number } })._count
      .registrations
    if (registrationCount >= event.capacity) {
      throw new Error('Event is full')
    }
  }

  const existing = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId, userId } },
  })

  if (existing) {
    throw new Error('Already registered for this event')
  }

  const registration = await prisma.eventRegistration.create({
    data: {
      eventId,
      userId,
    },
  })

  await createFeedPost({
    userId,
    type: 'EVENT_REGISTRATION',
    content: `Registered for ${event.title}`,
    eventRegistrationId: registration.id,
  })

  return registration
}

export async function markAttendance(
  eventId: string,
  userId: string,
  adminId: string
): Promise<void> {
  const registration = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId, userId } },
    include: { event: true },
  })

  if (!registration) {
    throw new Error('Registration not found')
  }

  if (registration.attended) {
    throw new Error('Attendance already marked')
  }

  await prisma.eventRegistration.update({
    where: { eventId_userId: { eventId, userId } },
    data: {
      attended: true,
      attendedAt: new Date(),
    },
  })

  if (registration.event.pointsReward > 0) {
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
      adminId,
      action: 'MARK_EVENT_ATTENDANCE',
      entityType: 'EventRegistration',
      entityId: registration.id,
      details: JSON.stringify({ eventId, userId }),
    },
  })
}

export async function createEvent(
  data: CreateEventInput,
  adminId: string
): Promise<Event> {
  const event = await prisma.event.create({
    data: {
      title: data.title,
      description: data.description,
      type: data.type,
      status: data.status ?? EventStatus.PUBLISHED,
      centerId: data.centerId,
      location: data.location,
      startDate: data.startDate,
      endDate: data.endDate,
      capacity: data.capacity,
      pointsReward: data.pointsReward ?? 0,
      imageUrl: data.imageUrl,
      isTournament: data.isTournament ?? false,
    },
  })

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'CREATE_EVENT',
      entityType: 'Event',
      entityId: event.id,
      details: JSON.stringify({ title: event.title, type: event.type }),
    },
  })

  return event
}

export async function updateEvent(
  id: string,
  data: Partial<CreateEventInput>,
  adminId: string
): Promise<Event> {
  const existing = await prisma.event.findUnique({ where: { id } })

  if (!existing) {
    throw new Error(`Event not found: ${id}`)
  }

  const updated = await prisma.event.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.centerId !== undefined && { centerId: data.centerId }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.startDate !== undefined && { startDate: data.startDate }),
      ...(data.endDate !== undefined && { endDate: data.endDate }),
      ...(data.capacity !== undefined && { capacity: data.capacity }),
      ...(data.pointsReward !== undefined && { pointsReward: data.pointsReward }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      ...(data.isTournament !== undefined && { isTournament: data.isTournament }),
    },
  })

  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action: 'UPDATE_EVENT',
      entityType: 'Event',
      entityId: id,
      details: JSON.stringify({ updatedFields: Object.keys(data) }),
    },
  })

  return updated
}
