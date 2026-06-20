import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { catchApiError } from '@/lib/api-error'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
    if (q.length < 2) {
      return NextResponse.json({ users: [], events: [], routes: [], challenges: [], query: q })
    }

    const [users, events, routes, challenges] = await Promise.all([
      prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { nickname: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, nickname: true, avatarUrl: true },
        take: 8,
      }),
      prisma.event.findMany({
        where: {
          status: 'PUBLISHED',
          startDate: { gte: new Date() },
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, title: true, type: true, startDate: true, centerId: true },
        take: 5,
      }),
      prisma.route.findMany({
        where: {
          isPublic: true,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, title: true, type: true, distanceKm: true, difficulty: true },
        take: 5,
      }),
      prisma.challenge.findMany({
        where: {
          isActive: true,
          title: { contains: q, mode: 'insensitive' },
        },
        select: { id: true, title: true, type: true, endDate: true, pointsReward: true },
        take: 5,
      }),
    ])

    return NextResponse.json({ users, events, routes, challenges, query: q })
  } catch (err) {
    return catchApiError(err)
  }
}
