'use server'

import { z } from 'zod'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { hashPassword, SESSION_COOKIE_NAME, createSession } from '@/lib/auth'
import { NotificationType, PointsSourceType, Role } from '@/generated/prisma'
import { randomBytes } from 'crypto'
import { sendVerificationEmail } from '@/services/email-service'
import { awardPoints } from '@/services/points'

const FAVORITE_SPORTS = [
  'Football',
  'Running',
  'Cycling',
  'Fitness',
  'Multi-sport',
] as const

const RegisterSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name is too long'),
    nickname: z
      .string()
      .min(2, 'Nickname must be at least 2 characters')
      .max(30, 'Nickname must be 30 characters or fewer')
      .regex(
        /^[a-zA-Z0-9_.-]+$/,
        'Nickname may only contain letters, numbers, underscores, dots, and hyphens'
      ),
    email: z.string().email('Please enter a valid email address'),
    phone: z
      .string()
      .max(30, 'Phone number is too long')
      .optional()
      .or(z.literal('')),
    dateOfBirth: z
      .string()
      .min(1, 'Date of birth is required')
      .refine((v) => {
        const d = new Date(v)
        if (isNaN(d.getTime())) return false
        const age = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
        return age >= 13
      }, 'You must be at least 13 years old to register'),
    centerId: z.string().optional().or(z.literal('')),
    favoriteSport: z
      .enum(FAVORITE_SPORTS, {
        error: 'Please select a valid sport',
      })
      .optional()
      .or(z.literal('')),
    referralCode: z.string().optional().or(z.literal('')),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password is too long'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type RegisterActionState = {
  errors: Record<string, string>
  values?: Record<string, string>
}

export async function registerAction(
  _prevState: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> {
  const rawValues: Record<string, string> = {
    name: (formData.get('name') as string) ?? '',
    nickname: (formData.get('nickname') as string) ?? '',
    email: (formData.get('email') as string) ?? '',
    phone: (formData.get('phone') as string) ?? '',
    dateOfBirth: (formData.get('dateOfBirth') as string) ?? '',
    centerId: (formData.get('centerId') as string) ?? '',
    favoriteSport: (formData.get('favoriteSport') as string) ?? '',
    referralCode: (formData.get('referralCode') as string) ?? '',
    // Do not echo passwords back
  }

  const parsed = RegisterSchema.safeParse({
    ...rawValues,
    password: (formData.get('password') as string) ?? '',
    confirmPassword: (formData.get('confirmPassword') as string) ?? '',
    referralCode: (formData.get('referralCode') as string) ?? '',
  })

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? '_form'
      if (!fieldErrors[key]) {
        fieldErrors[key] = issue.message
      }
    }
    return { errors: fieldErrors, values: rawValues }
  }

  const {
    name,
    nickname,
    email,
    phone,
    dateOfBirth,
    centerId,
    favoriteSport,
    referralCode,
    password,
  } = parsed.data

  // Check email uniqueness
  const existingEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })
  if (existingEmail) {
    return {
      errors: { email: 'An account with this email already exists' },
      values: rawValues,
    }
  }

  // Check nickname uniqueness
  const existingNickname = await prisma.user.findUnique({
    where: { nickname },
    select: { id: true },
  })
  if (existingNickname) {
    return {
      errors: { nickname: 'This nickname is already taken' },
      values: rawValues,
    }
  }

  // Validate centerId exists if provided
  if (centerId) {
    const center = await prisma.center.findUnique({
      where: { id: centerId },
      select: { id: true },
    })
    if (!center) {
      return {
        errors: { centerId: 'Selected center does not exist' },
        values: rawValues,
      }
    }
  }

  const passwordHash = await hashPassword(password)

  let userId: string
  try {
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        nickname: nickname.trim(),
        email: email.toLowerCase().trim(),
        phone: phone && phone.trim() !== '' ? phone.trim() : null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        passwordHash,
        role: Role.PLAYER,
        centerId: centerId !== '' ? centerId : null,
        playerProfile: {
          create: {
            favoriteSport: favoriteSport ?? null,
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        nickname: true,
        role: true,
      },
    })
    userId = user.id

    // Generate unique referral code for this new user
    try {
      const base = user.nickname.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)
      const generatedReferralCode = base + randomBytes(3).toString('hex')
      await prisma.user.update({
        where: { id: user.id },
        data: { referralCode: generatedReferralCode },
      })
    } catch (refCodeErr) {
      console.warn('[register] Failed to generate referral code:', refCodeErr)
    }

    // Handle incoming referral code
    if (referralCode && referralCode.trim() !== '') {
      try {
        const referrer = await prisma.user.findUnique({
          where: { referralCode: referralCode.trim() },
          select: { id: true, name: true },
        })
        if (referrer && referrer.id !== user.id) {
          // Check no duplicate referral exists for this user
          const existingReferral = await prisma.referral.findUnique({
            where: { referredId: user.id },
          })
          if (!existingReferral) {
            await prisma.referral.create({
              data: {
                referrerId: referrer.id,
                referredId: user.id,
                pointsAwarded: true,
              },
            })
            // Award 100 pts to referrer
            await awardPoints(
              referrer.id,
              100,
              PointsSourceType.REFERRAL,
              user.id,
              'Referral bonus — friend joined',
            )
            // Award 50 pts to new user
            await awardPoints(
              user.id,
              50,
              PointsSourceType.REFERRAL,
              referrer.id,
              'Welcome bonus — joined via referral',
            )
            // Notify referrer
            await prisma.notification.create({
              data: {
                userId: referrer.id,
                type: NotificationType.REFERRAL_REWARD,
                title: 'Referral Reward',
                body: `${user.name} joined using your referral link — you earned 100 pts!`,
                linkUrl: '/app/referrals',
              },
            })
          }
        }
      } catch (referralErr) {
        console.warn('[register] Failed to process referral:', referralErr)
      }
    }

    // Send email verification (non-blocking — don't fail registration if email fails)
    try {
      const emailToken = randomBytes(32).toString('hex')
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerifyToken: emailToken },
      })
      await sendVerificationEmail(email.toLowerCase().trim(), name.trim(), emailToken)
    } catch (emailErr) {
      console.warn('[register] Failed to send verification email:', emailErr)
    }

    // Create session cookie
    const cookieStore = await cookies()
    const sessionToken = createSession({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      nickname: user.nickname,
    })
    // Parse the Set-Cookie header string to extract token value and attributes
    const tokenMatch = sessionToken.match(/^[^=]+=([^;]+)/)
    if (tokenMatch) {
      cookieStore.set(SESSION_COOKIE_NAME, tokenMatch[1], {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
    }
  } catch (err) {
    console.error('[register] DB error:', err)
    return {
      errors: {
        _form:
          'Something went wrong while creating your account. Please try again.',
      },
      values: rawValues,
    }
  }

  redirect('/app')
}
