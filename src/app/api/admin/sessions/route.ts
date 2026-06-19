import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createSession } from '@/services/sessions'
import { ActivityType } from '@/generated/prisma'
import { prisma } from '@/lib/db'

type RecurrenceType = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'

function addInterval(date: Date, recurrenceType: RecurrenceType): Date {
  const next = new Date(date)
  switch (recurrenceType) {
    case 'DAILY':
      next.setDate(next.getDate() + 1)
      break
    case 'WEEKLY':
      next.setDate(next.getDate() + 7)
      break
    case 'BIWEEKLY':
      next.setDate(next.getDate() + 14)
      break
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1)
      break
  }
  return next
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'PLATFORM_ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { centerId, title, description, type, startTime, endTime, capacity, pointsReward, isPublic, isRecurring, recurrenceType, recurrenceEndDate } = body

  if (!centerId || !title || !type || !startTime || !endTime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!Object.values(ActivityType).includes(type)) {
    return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 })
  }

  const start = new Date(startTime)
  const end = new Date(endTime)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return NextResponse.json({ error: 'Invalid time range' }, { status: 400 })
  }

  const sessionData = {
    title,
    description,
    type: type as ActivityType,
    startTime: start,
    endTime: end,
    capacity: capacity ?? -1,
    pointsReward: pointsReward ?? 0,
    isPublic: isPublic ?? true,
  }

  if (!isRecurring) {
    const session = await createSession(centerId, user.id, sessionData)
    return NextResponse.json({ ok: true, id: session.id })
  }

  // Validate recurrence params
  const validTypes: RecurrenceType[] = ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']
  if (!recurrenceType || !validTypes.includes(recurrenceType as RecurrenceType)) {
    return NextResponse.json({ error: 'Invalid recurrence type' }, { status: 400 })
  }
  if (!recurrenceEndDate) {
    return NextResponse.json({ error: 'Recurrence end date is required' }, { status: 400 })
  }
  const endDate = new Date(recurrenceEndDate)
  if (isNaN(endDate.getTime()) || endDate <= start) {
    return NextResponse.json({ error: 'Recurrence end date must be after start date' }, { status: 400 })
  }

  const duration = end.getTime() - start.getTime()

  // Create parent session
  const parent = await prisma.centerSession.create({
    data: {
      centerId,
      createdById: user.id,
      title: sessionData.title,
      description: sessionData.description,
      type: sessionData.type,
      startTime: sessionData.startTime,
      endTime: sessionData.endTime,
      capacity: sessionData.capacity,
      pointsReward: sessionData.pointsReward,
      isPublic: sessionData.isPublic,
      isRecurring: true,
      recurrenceType: recurrenceType as string,
      recurrenceEndDate: endDate,
    },
  })

  // Generate child sessions
  const MAX_CHILDREN = 52
  const children: Array<{
    centerId: string
    createdById: string
    title: string
    description?: string
    type: ActivityType
    startTime: Date
    endTime: Date
    capacity: number
    pointsReward: number
    isPublic: boolean
    isRecurring: boolean
    parentSessionId: string
    recurrenceType: string
    recurrenceEndDate: Date
  }> = []
  let currentStart = addInterval(start, recurrenceType as RecurrenceType)

  while (currentStart <= endDate && children.length < MAX_CHILDREN) {
    const currentEnd = new Date(currentStart.getTime() + duration)
    children.push({
      centerId,
      createdById: user.id,
      title: sessionData.title,
      description: sessionData.description,
      type: sessionData.type,
      startTime: new Date(currentStart),
      endTime: currentEnd,
      capacity: sessionData.capacity,
      pointsReward: sessionData.pointsReward,
      isPublic: sessionData.isPublic,
      isRecurring: true,
      parentSessionId: parent.id,
      recurrenceType: recurrenceType as string,
      recurrenceEndDate: endDate,
    })
    currentStart = addInterval(currentStart, recurrenceType as RecurrenceType)
  }

  if (children.length > 0) {
    await prisma.centerSession.createMany({ data: children })
  }

  return NextResponse.json({ ok: true, id: parent.id, childCount: children.length })
}
