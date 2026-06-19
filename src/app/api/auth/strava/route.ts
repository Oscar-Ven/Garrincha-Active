import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generateOAuthState, setOAuthStateCookie, buildStravaAuthUrl } from '@/lib/oauth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`)
  }
  const state = generateOAuthState()
  await setOAuthStateCookie(state)
  return NextResponse.redirect(buildStravaAuthUrl(state))
}
