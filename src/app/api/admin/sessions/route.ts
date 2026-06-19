import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createSession } from '@/services/sessions'
import { ActivityType } from '@/generated/prisma'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'PLATFORM_ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { centerId, title, description, type, startTime, endTime, capacity, pointsReward, isPublic } = body

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

  const session = await createSession(centerId, user.id, {
    title,
    description,
    type,
    startTime: start,
    endTime: end,
    capacity,
    pointsReward,
    isPublic,
  })

  return NextResponse.json({ ok: true, id: session.id })
}
