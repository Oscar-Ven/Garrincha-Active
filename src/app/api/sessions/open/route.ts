import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ActivityType, SkillLevel } from '@/generated/prisma'
import { createOpenGame } from '@/services/sessions'
import { catchApiError } from '@/lib/api-error'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { centerId: true },
    })

    if (!fullUser?.centerId) {
      return NextResponse.json(
        { error: 'You must be associated with a center to create an open game.' },
        { status: 400 },
      )
    }

    const body = await req.json()
    const { title, type, date, startHour, startMinute, durationMinutes, capacity, minSkillLevel, maxSkillLevel, description } = body

    if (!title?.trim()) return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
    if (!type || !Object.values(ActivityType).includes(type))
      return NextResponse.json({ error: 'Invalid activity type.' }, { status: 400 })

    const startTime = new Date(date)
    startTime.setHours(Number(startHour), Number(startMinute), 0, 0)
    if (isNaN(startTime.getTime()) || startTime < new Date())
      return NextResponse.json({ error: 'Start time must be in the future.' }, { status: 400 })

    const endTime = new Date(startTime.getTime() + Number(durationMinutes) * 60_000)

    const validSkills = Object.values(SkillLevel)
    const minSkill = validSkills.includes(minSkillLevel) ? minSkillLevel : undefined
    const maxSkill = validSkills.includes(maxSkillLevel) ? maxSkillLevel : undefined

    const session = await createOpenGame(fullUser.centerId, user.id, {
      title: title.trim(),
      description: description?.trim() || undefined,
      type,
      startTime,
      endTime,
      capacity: capacity ? Number(capacity) : undefined,
      minSkillLevel: minSkill,
      maxSkillLevel: maxSkill,
    })

    return NextResponse.json({ sessionId: session.id }, { status: 201 })
  } catch (err) {
    return catchApiError(err)
  }
}
