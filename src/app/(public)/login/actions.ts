'use server'

import { prisma } from '@/lib/db'
import { verifyPassword, createSession, clearSession, SESSION_COOKIE_NAME } from '@/lib/auth'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Role } from '@/generated/prisma'

export async function loginAction(
  formData: FormData,
): Promise<{ error: string }> {
  const email = (formData.get('email') as string | null)?.trim().toLowerCase() ?? ''
  const password = (formData.get('password') as string | null) ?? ''

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { playerProfile: true },
  })

  if (!user || !user.isActive) {
    return { error: 'Invalid email or password.' }
  }

  const passwordValid = await verifyPassword(password, user.passwordHash)
  if (!passwordValid) {
    return { error: 'Invalid email or password.' }
  }

  // createSession returns a Set-Cookie header string; extract the token value
  const headerString = createSession({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    nickname: user.nickname,
  })

  // Header format: "ga_session=TOKEN; HttpOnly; Path=/; Max-Age=...; SameSite=Lax"
  const tokenValue = headerString.split(';')[0].split('=').slice(1).join('=')

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, tokenValue, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
  })

  if (user.role === Role.PLATFORM_ADMIN) {
    redirect('/admin')
  }

  redirect('/app')
}

export async function logoutAction(): Promise<never> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
  })

  redirect('/')
}
