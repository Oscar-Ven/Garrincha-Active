import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { catchApiError } from '@/lib/api-error'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'PLATFORM_ADMIN' && user.role !== 'OWNER' && user.role !== 'CENTER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = req.nextUrl.searchParams.get('email')
    if (!email) return NextResponse.json({ error: 'email param required' }, { status: 400 })

    const found = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    })

    if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(found)
  } catch (err) {
    return catchApiError(err)
  }
}
