import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'

export function generateOAuthState(): string {
  const state = randomBytes(16).toString('hex')
  return state
}

export async function setOAuthStateCookie(state: string) {
  const cookieStore = await cookies()
  cookieStore.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  })
}

export async function verifyOAuthState(state: string): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get('oauth_state')?.value
  cookieStore.delete('oauth_state')
  return stored === state
}

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export function buildStravaAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/strava/callback`,
    response_type: 'code',
    scope: 'read,activity:read_all',
    state,
    approval_prompt: 'auto',
  })
  return `https://www.strava.com/oauth/authorize?${params}`
}
