import { twilioClient, twilioFrom } from '@/lib/sms'
import { prisma } from '@/lib/db'
import { checkRateLimit, otpRatelimit } from '@/lib/redis'

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function sendPhoneOtp(userId: string, phone: string): Promise<{ ok: boolean; error?: string }> {
  const { allowed } = await checkRateLimit(otpRatelimit, `otp:${phone}`)
  if (!allowed) return { ok: false, error: 'Too many OTP requests. Please wait 10 minutes.' }

  const otp = generateOtp()
  const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  await prisma.user.update({
    where: { id: userId },
    data: { phoneOtp: otp, phoneOtpExpires: expires },
  })

  if (!twilioClient) {
    // Dev fallback: log to console
    console.log(`[SMS DEV] OTP for ${phone}: ${otp}`)
    return { ok: true }
  }

  try {
    await twilioClient.messages.create({
      body: `Your Garrincha Active verification code is: ${otp}. Valid for 10 minutes.`,
      from: twilioFrom,
      to: phone,
    })
    return { ok: true }
  } catch (err) {
    console.error('[SMS] Failed to send OTP:', err)
    return { ok: false, error: 'Failed to send SMS. Please try again.' }
  }
}

export async function verifyPhoneOtp(userId: string, otp: string): Promise<{ ok: boolean; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phoneOtp: true, phoneOtpExpires: true },
  })

  if (!user?.phoneOtp || !user.phoneOtpExpires) {
    return { ok: false, error: 'No pending OTP. Please request a new one.' }
  }

  if (new Date() > user.phoneOtpExpires) {
    return { ok: false, error: 'OTP has expired. Please request a new one.' }
  }

  if (user.phoneOtp !== otp) {
    return { ok: false, error: 'Invalid OTP.' }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { phoneVerified: new Date(), phoneOtp: null, phoneOtpExpires: null },
  })

  return { ok: true }
}

export async function sendSmsAlert(
  phone: string,
  message: string,
): Promise<void> {
  if (!twilioClient) {
    console.log(`[SMS DEV] Alert to ${phone}: ${message}`)
    return
  }
  try {
    await twilioClient.messages.create({ body: message, from: twilioFrom, to: phone })
  } catch (err) {
    console.error('[SMS] Failed to send alert:', err)
  }
}
