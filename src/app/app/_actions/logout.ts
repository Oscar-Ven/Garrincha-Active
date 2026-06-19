'use server'

import { cookies } from 'next/headers'
import { SESSION_COOKIE_NAME } from '@/lib/auth'

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
  })
}
