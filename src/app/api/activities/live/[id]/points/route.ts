import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { catchApiError } from '@/lib/api-error'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const session = await prisma.liveTrackingSession.findFirst({
      where: { id, userId: user.id, isActive: true },
      select: { id: true },
    })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const body = await req.json()
    const { points } = body
    if (!Array.isArray(points) || points.length === 0) {
      return NextResponse.json({ ok: true, added: 0 })
    }

    const existingCount = await prisma.trackingPoint.count({ where: { sessionId: id } })

    await prisma.trackingPoint.createMany({
      data: points.map((p: {
        lat: number; lng: number; alt?: number | null
        speed?: number | null; accuracy?: number | null; timestamp: string
      }, i: number) => ({
        sessionId: id,
        lat: p.lat,
        lng: p.lng,
        alt: p.alt ?? null,
        speed: p.speed ?? null,
        accuracy: p.accuracy ?? null,
        timestamp: new Date(p.timestamp),
        sequence: existingCount + i + 1,
      })),
    })

    return NextResponse.json({ ok: true, added: points.length })
  } catch (err) {
    return catchApiError(err)
  }
}
