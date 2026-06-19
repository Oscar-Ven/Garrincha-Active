import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createSession, SESSION_COOKIE_NAME } from '@/lib/auth'
import { verifyOAuthState } from '@/lib/oauth'
import { randomBytes } from 'crypto'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code || !state || !(await verifyOAuthState(state))) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=${encodeURIComponent('OAuth state invalid. Please try again.')}`,
    )
  }

  // Exchange code for tokens
  let tokens: {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    scope?: string
    error?: string
  }
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })
    tokens = await tokenRes.json()
  } catch {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=${encodeURIComponent('Failed to exchange Google auth code.')}`,
    )
  }

  if (tokens.error || !tokens.access_token) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=${encodeURIComponent('Google authentication failed.')}`,
    )
  }

  // Get user info from Google
  let googleUser: { sub?: string; email?: string; name?: string; picture?: string }
  try {
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    googleUser = await userRes.json()
  } catch {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=${encodeURIComponent('Failed to fetch Google user info.')}`,
    )
  }

  if (!googleUser.sub || !googleUser.email) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=${encodeURIComponent('Google did not return required user info.')}`,
    )
  }

  // Find or create user
  let user = await prisma.user.findFirst({
    where: {
      oauthAccounts: {
        some: { provider: 'google', providerAccountId: googleUser.sub },
      },
    },
  })

  if (!user) {
    // Check if email already exists — link accounts
    user = await prisma.user.findUnique({ where: { email: googleUser.email } })

    if (!user) {
      // Create a new user
      const baseName = (googleUser.name ?? googleUser.email.split('@')[0])
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 20)
      const suffix = randomBytes(2).toString('hex')
      const nickname = `${baseName}_${suffix}`
      const referralCode = nickname.slice(0, 8) + randomBytes(3).toString('hex')

      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name ?? googleUser.email.split('@')[0],
          nickname,
          passwordHash: 'oauth_' + randomBytes(16).toString('hex'),
          avatarUrl: googleUser.picture ?? null,
          emailVerified: new Date(),
          referralCode,
          playerProfile: { create: {} },
        },
      })
    }

    // Link the Google OAuth account
    await prisma.oAuthAccount.upsert({
      where: {
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId: googleUser.sub,
        },
      },
      create: {
        userId: user.id,
        provider: 'google',
        providerAccountId: googleUser.sub,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        scope: tokens.scope ?? null,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
      },
    })
  }

  // Build session token — createSession returns a Set-Cookie header string;
  // extract just the token value (same pattern as login/actions.ts)
  const headerString = createSession({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    nickname: user.nickname,
  })
  const tokenValue = headerString.split(';')[0].split('=').slice(1).join('=')

  const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/app`)
  response.cookies.set(SESSION_COOKIE_NAME, tokenValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return response
}
