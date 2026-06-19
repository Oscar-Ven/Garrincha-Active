import { createHmac } from 'crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { Role } from '@/generated/prisma'

export const SESSION_COOKIE_NAME = 'ga_session'

const SECRET = process.env.SESSION_SECRET ?? 'garrincha-active-default-secret-change-in-prod'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds

export interface SessionUser {
  id: string
  email: string
  role: Role
  name: string
  nickname: string
}

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex')
}

function encodeSession(user: SessionUser): string {
  const payload = Buffer.from(JSON.stringify(user)).toString('base64')
  const signature = sign(payload)
  return `${payload}.${signature}`
}

function decodeSession(token: string): SessionUser | null {
  try {
    const dotIndex = token.lastIndexOf('.')
    if (dotIndex === -1) return null

    const payload = token.substring(0, dotIndex)
    const signature = token.substring(dotIndex + 1)

    const expectedSignature = sign(payload)
    if (signature !== expectedSignature) return null

    const json = Buffer.from(payload, 'base64').toString('utf-8')
    const user = JSON.parse(json) as SessionUser

    if (!user.id || !user.email || !user.role) return null

    return user
  } catch {
    return null
  }
}

export function createSession(user: {
  id: string
  email: string
  role: Role
  name: string
  nickname: string
}): string {
  const token = encodeSession(user)
  return `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax`
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const cookie = cookieStore.get(SESSION_COOKIE_NAME)
    if (!cookie?.value) return null
    return decodeSession(cookie.value)
  } catch {
    return null
  }
}

export function clearSession(): string {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
}

export async function requireAuth(role?: Role): Promise<SessionUser> {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (role && user.role !== role) {
    redirect('/unauthorized')
  }

  return user
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
