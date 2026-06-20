import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { verifyPhoneOtp } from '@/services/sms-service'
import { authRatelimit } from '@/lib/redis'

export async function POST(req: NextRequest) {
  // Rate-limit OTP verification to block brute-force attempts
  if (authRatelimit) {
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'anonymous'
    const { success } = await authRatelimit.limit(`verify:${ip}`)
    if (!success) return NextResponse.json({ error: 'Too many attempts. Please wait.' }, { status: 429 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const otp = (body.otp as string | undefined)?.trim()

  if (!otp) return NextResponse.json({ error: 'OTP is required.' }, { status: 400 })

  const result = await verifyPhoneOtp(user.id, otp)

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  return NextResponse.json({ ok: true })
}
