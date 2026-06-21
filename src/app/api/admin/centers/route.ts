import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { catchApiError } from '@/lib/api-error'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'PLATFORM_ADMIN' && user.role !== 'CENTER_ADMIN' && user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const centers = await prisma.center.findMany({
      select: { id: true, name: true, city: true, isActive: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(centers)
  } catch (err) {
    return catchApiError(err)
  }
}
