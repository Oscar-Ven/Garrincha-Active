import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { verifyPhoneOtp } from '@/services/sms-service'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const otp = (body.otp as string | undefined)?.trim()

  if (!otp) return NextResponse.json({ error: 'OTP is required.' }, { status: 400 })

  const result = await verifyPhoneOtp(user.id, otp)

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  return NextResponse.json({ ok: true })
}
