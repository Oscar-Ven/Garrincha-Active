import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { MembershipStatus } from '@/generated/prisma'
import { catchApiError } from '@/lib/api-error'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'PLATFORM_ADMIN' && user.role !== 'OWNER' && user.role !== 'CENTER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const centerId = searchParams.get('centerId')

    const memberships = await prisma.membership.findMany({
      where: centerId ? { centerId } : undefined,
      include: {
        user: { select: { id: true, name: true, nickname: true, email: true } },
        plan: { select: { id: true, name: true } },
        center: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json(memberships)
  } catch (err) {
    return catchApiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'PLATFORM_ADMIN' && user.role !== 'OWNER' && user.role !== 'CENTER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { userId, centerId, planId, startDate, expiryDate, notes } = body

    if (!userId || !centerId || !startDate || !expiryDate) {
      return NextResponse.json({ error: 'userId, centerId, startDate, expiryDate are required.' }, { status: 400 })
    }

    const [center, targetUser] = await Promise.all([
      prisma.center.findUnique({ where: { id: centerId }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
    ])
    if (!center) return NextResponse.json({ error: 'Center not found.' }, { status: 404 })
    if (!targetUser) return NextResponse.json({ error: 'User not found.' }, { status: 404 })

    const membership = await prisma.membership.create({
      data: {
        userId,
        centerId,
        planId: planId || null,
        status: MembershipStatus.ACTIVE,
        startDate: new Date(startDate),
        expiryDate: new Date(expiryDate),
        notes: notes?.trim() || null,
      },
    })

    return NextResponse.json({ id: membership.id }, { status: 201 })
  } catch (err) {
    return catchApiError(err)
  }
}
