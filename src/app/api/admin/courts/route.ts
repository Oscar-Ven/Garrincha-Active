import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { catchApiError } from '@/lib/api-error'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'PLATFORM_ADMIN' && user.role !== 'CENTER_ADMIN' && user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { centerId, name, sport, description } = await req.json()
    if (!centerId || !name?.trim()) return NextResponse.json({ error: 'centerId and name required.' }, { status: 400 })

    const court = await prisma.court.create({
      data: { centerId, name: name.trim(), sport: sport?.trim() || null, description: description?.trim() || null },
      include: { center: { select: { id: true, name: true } } },
    })
    return NextResponse.json(court, { status: 201 })
  } catch (err) {
    return catchApiError(err)
  }
}
