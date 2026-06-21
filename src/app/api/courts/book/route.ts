import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { catchApiError } from '@/lib/api-error'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { courtId, date, startHour, startMinute, durationMinutes, notes } = await req.json()
    if (!courtId || !date) return NextResponse.json({ error: 'courtId and date required.' }, { status: 400 })

    const court = await prisma.court.findUnique({ where: { id: courtId }, select: { id: true, isActive: true } })
    if (!court || !court.isActive) return NextResponse.json({ error: 'Court not found.' }, { status: 404 })

    const startTime = new Date(date)
    startTime.setHours(Number(startHour ?? 9), Number(startMinute ?? 0), 0, 0)
    if (isNaN(startTime.getTime()) || startTime < new Date())
      return NextResponse.json({ error: 'Start time must be in the future.' }, { status: 400 })

    const endTime = new Date(startTime.getTime() + Number(durationMinutes ?? 60) * 60_000)

    // Conflict check
    const conflict = await prisma.courtBooking.findFirst({
      where: {
        courtId,
        status: { in: ['CONFIRMED', 'PENDING'] },
        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
      },
    })
    if (conflict) return NextResponse.json({ error: 'This time slot is already booked.' }, { status: 409 })

    const booking = await prisma.courtBooking.create({
      data: { courtId, userId: user.id, date: new Date(date), startTime, endTime, notes: notes?.trim() || null },
    })
    return NextResponse.json({ bookingId: booking.id }, { status: 201 })
  } catch (err) {
    return catchApiError(err)
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const courtId = req.nextUrl.searchParams.get('courtId')
    const date = req.nextUrl.searchParams.get('date')
    if (!courtId || !date) return NextResponse.json({ error: 'courtId and date required.' }, { status: 400 })

    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)

    const bookings = await prisma.courtBooking.findMany({
      where: { courtId, status: { in: ['CONFIRMED', 'PENDING'] }, startTime: { gte: start, lte: end } },
      select: { startTime: true, endTime: true },
      orderBy: { startTime: 'asc' },
    })
    return NextResponse.json(bookings)
  } catch (err) {
    return catchApiError(err)
  }
}
