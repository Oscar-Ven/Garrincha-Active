import { NextResponse } from 'next/server'
import { generateOAuthState, setOAuthStateCookie, buildGoogleAuthUrl } from '@/lib/oauth'

export async function GET() {
  const state = generateOAuthState()
  await setOAuthStateCookie(state)
  return NextResponse.redirect(buildGoogleAuthUrl(state))
}
