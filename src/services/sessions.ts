import { prisma } from '@/lib/db'
import { ActivityType, AttendanceStatus } from '@/generated/prisma'
import { awardPoints } from './points'

export interface CreateSessionInput {
  title: string
  description?: string
  type: ActivityType
  startTime: Date
  endTime: Date
  capacity?: number
  pointsReward?: number
  isPublic?: boolean
}

export async function getUpcomingSessions(centerId?: string) {
  return prisma.centerSession.findMany({
    where: {
      ...(centerId ? { centerId } : {}),
      isPublic: true,
      startTime: { gte: new Date() },
    },
    include: {
      center: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, nickname: true } },
      _count: { select: { participants: { where: { status: { not: 'CANCELLED' } } } } },
    },
    orderBy: { startTime: 'asc' },
    take: 50,
  })
}

export async function getSession(sessionId: string) {
  return prisma.centerSession.findUnique({
    where: { id: sessionId },
    include: {
      center: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, nickname: true } },
      participants: {
        where: { status: { not: 'CANCELLED' } },
        include: { user: { select: { id: true, name: true, nickname: true, avatarUrl: true } } },
        orderBy: { registeredAt: 'asc' },
      },
      _count: {
        select: {
          participants: {
            where: { status: { in: ['REGISTERED', 'ATTENDED'] } },
          },
        },
      },
    },
  })
}

export async function createSession(centerId: string, createdById: string, data: CreateSessionInput) {
  return prisma.centerSession.create({
    data: {
      centerId,
      createdById,
      title: data.title,
      description: data.description,
      type: data.type,
      startTime: data.startTime,
      endTime: data.endTime,
      capacity: data.capacity ?? -1,
      pointsReward: data.pointsReward ?? 0,
      isPublic: data.isPublic ?? true,
    },
  })
}

export async function getCenterSessions(centerId: string) {
  return prisma.centerSession.findMany({
    where: { centerId },
    include: {
      _count: { select: { participants: { where: { status: { not: 'CANCELLED' } } } } },
    },
    orderBy: { startTime: 'desc' },
    take: 30,
  })
}

export async function registerForSession(sessionId: string, userId: string): Promise<{ ok: boolean; reason?: string }> {
  const session = await prisma.centerSession.findUnique({
    where: { id: sessionId },
    include: {
      _count: {
        select: {
          participants: {
            where: { status: { in: ['REGISTERED', 'ATTENDED'] } },
          },
        },
      },
    },
  })
  if (!session) return { ok: false, reason: 'NOT_FOUND' }
  if (session.startTime < new Date()) return { ok: false, reason: 'PAST' }

  const existing = await prisma.sessionParticipant.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
  })
  if (existing && existing.status !== AttendanceStatus.CANCELLED) return { ok: false, reason: 'ALREADY_REGISTERED' }

  // Count confirmed spots (REGISTERED + ATTENDED), not WAITLISTED/CANCELLED/MISSED
  const confirmedCount = session._count.participants
  const isFull = session.capacity > 0 && confirmedCount >= session.capacity
  const newStatus = isFull ? AttendanceStatus.WAITLISTED : AttendanceStatus.REGISTERED

  if (existing) {
    await prisma.sessionParticipant.update({
      where: { sessionId_userId: { sessionId, userId } },
      data: { status: newStatus, registeredAt: new Date() },
    })
  } else {
    await prisma.sessionParticipant.create({
      data: { sessionId, userId, status: newStatus, registeredAt: new Date() },
    })
  }

  await prisma.notification.create({
    data: {
      userId,
      type: 'SESSION_REMINDER',
      title: isFull
        ? `Added to waitlist for ${session.title}`
        : `You're registered for ${session.title}`,
      body: isFull
        ? `You're on the waitlist for ${session.title}. We'll notify you if a spot opens.`
        : session.pointsReward > 0
          ? `${session.pointsReward} pts on attendance · ${session.startTime.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`
          : `Session on ${session.startTime.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`,
      linkUrl: `/app/sessions/${sessionId}`,
    },
  })

  return { ok: true }
}

export async function promoteFromSessionWaitlist(sessionId: string): Promise<void> {
  const session = await prisma.centerSession.findUnique({
    where: { id: sessionId },
    select: { title: true },
  })
  if (!session) return

  const firstWaitlisted = await prisma.sessionParticipant.findFirst({
    where: { sessionId, status: AttendanceStatus.WAITLISTED },
    orderBy: { registeredAt: 'asc' },
  })

  if (!firstWaitlisted) return

  await prisma.sessionParticipant.update({
    where: { sessionId_userId: { sessionId, userId: firstWaitlisted.userId } },
    data: { status: AttendanceStatus.REGISTERED },
  })

  await prisma.notification.create({
    data: {
      userId: firstWaitlisted.userId,
      type: 'SESSION_REMINDER',
      title: 'Spot opened up!',
      body: `Good news! A spot opened up in ${session.title}. You're now registered.`,
      linkUrl: `/app/sessions/${sessionId}`,
    },
  })
}

export async function cancelRegistration(sessionId: string, userId: string) {
  const existing = await prisma.sessionParticipant.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
  })

  await prisma.sessionParticipant.update({
    where: { sessionId_userId: { sessionId, userId } },
    data: { status: 'CANCELLED' },
  })

  // Only promote from waitlist if the cancelled participant had a confirmed spot
  if (existing && (existing.status === AttendanceStatus.REGISTERED || existing.status === AttendanceStatus.ATTENDED)) {
    await promoteFromSessionWaitlist(sessionId)
  }
}

export async function markAttended(sessionId: string, userId: string) {
  const participant = await prisma.sessionParticipant.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
    include: { session: true },
  })
  if (!participant || participant.pointsAwarded) return

  await prisma.sessionParticipant.update({
    where: { sessionId_userId: { sessionId, userId } },
    data: { status: 'ATTENDED', pointsAwarded: true },
  })

  const pts = participant.session.pointsReward
  if (pts > 0) {
    await awardPoints(userId, pts, 'SESSION_ATTENDANCE', sessionId, `Attended: ${participant.session.title}`)
  }
}

export async function getUserRegistrations(userId: string) {
  return prisma.sessionParticipant.findMany({
    where: { userId },
    include: {
      session: {
        include: { center: { select: { id: true, name: true } } },
      },
    },
    orderBy: { session: { startTime: 'desc' } },
    take: 20,
  })
}
