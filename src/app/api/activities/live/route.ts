import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ActivityType } from '@/generated/prisma'
import { catchApiError } from '@/lib/api-error'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { type } = body

    if (!type || !Object.values(ActivityType).includes(type)) {
      return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 })
    }

    const session = await prisma.liveTrackingSession.create({
      data: {
        userId: user.id,
        type: type as ActivityType,
        isActive: true,
      },
      select: { id: true },
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (err) {
    return catchApiError(err)
  }
}
