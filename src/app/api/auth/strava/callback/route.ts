import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { verifyOAuthState } from '@/lib/oauth'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')

  if (errorParam) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/app/profile?error=${encodeURIComponent('Strava connection was denied.')}`,
    )
  }

  if (!code || !state || !(await verifyOAuthState(state))) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/app/profile?error=${encodeURIComponent('OAuth state invalid. Please try again.')}`,
    )
  }

  const session = await getCurrentUser()
  if (!session) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`)
  }

  // Exchange code for Strava tokens
  let stravaData: {
    access_token?: string
    refresh_token?: string
    expires_at?: number
    athlete?: { id?: number; firstname?: string; lastname?: string }
    errors?: unknown
    message?: string
  }
  try {
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    })
    stravaData = await tokenRes.json()
  } catch {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/app/profile?error=${encodeURIComponent('Failed to exchange Strava auth code.')}`,
    )
  }

  if (!stravaData.access_token || !stravaData.athlete?.id) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/app/profile?error=${encodeURIComponent('Strava authentication failed.')}`,
    )
  }

  const athleteId = stravaData.athlete.id.toString()
  const athleteName = [stravaData.athlete.firstname, stravaData.athlete.lastname]
    .filter(Boolean)
    .join(' ')

  await prisma.oAuthAccount.upsert({
    where: {
      provider_providerAccountId: {
        provider: 'strava',
        providerAccountId: athleteId,
      },
    },
    create: {
      userId: session.id,
      provider: 'strava',
      providerAccountId: athleteId,
      accessToken: stravaData.access_token,
      refreshToken: stravaData.refresh_token ?? null,
      // Strava returns expires_at as a Unix timestamp (seconds)
      expiresAt: stravaData.expires_at ? new Date(stravaData.expires_at * 1000) : null,
      scope: 'read,activity:read_all',
    },
    update: {
      accessToken: stravaData.access_token,
      refreshToken: stravaData.refresh_token ?? undefined,
      expiresAt: stravaData.expires_at ? new Date(stravaData.expires_at * 1000) : null,
    },
  })

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/app/profile?strava=connected&athlete=${encodeURIComponent(athleteName)}`,
  )
}
