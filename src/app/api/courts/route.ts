import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { catchApiError } from '@/lib/api-error'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const centerId = req.nextUrl.searchParams.get('centerId')
    const courts = await prisma.court.findMany({
      where: { isActive: true, ...(centerId ? { centerId } : {}) },
      include: { center: { select: { id: true, name: true } } },
      orderBy: [{ centerId: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json(courts)
  } catch (err) {
    return catchApiError(err)
  }
}
