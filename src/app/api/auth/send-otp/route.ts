import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendPhoneOtp } from '@/services/sms-service'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const phone = (body.phone as string | undefined)?.trim()

  if (!phone) return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 })

  // Save the phone to the user record so we can verify later
  await prisma.user.update({ where: { id: user.id }, data: { phone } })

  const result = await sendPhoneOtp(user.id, phone)

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 429 })

  return NextResponse.json({ ok: true })
}
