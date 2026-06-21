import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { DirectChallengeType } from '@/generated/prisma'
import { catchApiError } from '@/lib/api-error'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { challengeeId, type, targetValue, endDate, message } = body

    if (!challengeeId || !type || !targetValue || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!Object.values(DirectChallengeType).includes(type)) {
      return NextResponse.json({ error: 'Invalid challenge type' }, { status: 400 })
    }

    if (challengeeId === user.id) {
      return NextResponse.json({ error: "You can't challenge yourself" }, { status: 400 })
    }

    const challengee = await prisma.user.findUnique({ where: { id: challengeeId } })
    if (!challengee) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    const challenge = await prisma.directChallenge.create({
      data: {
        challengerId: user.id,
        challengeeId,
        type,
        targetValue: parseFloat(targetValue),
        endDate: new Date(endDate),
        status: 'PENDING',
        message: message ?? null,
      },
    })

    await prisma.notification.create({
      data: {
        userId: challengeeId,
        type: 'DIRECT_CHALLENGE_RECEIVED',
        title: '⚔️ You have a new challenge!',
        body: `${user.name} challenged you to a ${type.toLowerCase().replace('_', ' ')} duel`,
        linkUrl: `/app/challenges/direct/${challenge.id}`,
      },
    })

    return NextResponse.json({ id: challenge.id })
  } catch (err) {
    return catchApiError(err)
  }
}
