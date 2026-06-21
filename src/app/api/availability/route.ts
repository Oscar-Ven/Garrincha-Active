import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { catchApiError } from '@/lib/api-error'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const slots = await prisma.userAvailability.findMany({
      where: { userId: user.id },
      orderBy: [{ dayOfWeek: 'asc' }, { startHour: 'asc' }],
    })
    return NextResponse.json(slots)
  } catch (err) {
    return catchApiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { dayOfWeek, startHour, endHour, note } = await req.json()
    if (startHour == null || endHour == null || endHour <= startHour)
      return NextResponse.json({ error: 'Invalid time range.' }, { status: 400 })
    const slot = await prisma.userAvailability.create({
      data: { userId: user.id, dayOfWeek: dayOfWeek ?? null, startHour, endHour, note: note?.trim() || null },
    })
    return NextResponse.json(slot, { status: 201 })
  } catch (err) {
    return catchApiError(err)
  }
}
