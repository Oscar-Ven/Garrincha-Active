import { NextResponse, NextRequest } from 'next/server'

const PROTECTED_ROUTES = ['/app', '/admin', '/owner']
const ADMIN_ROUTES = ['/admin']
const OWNER_ROUTES = ['/owner']
const ADMIN_ROLES = ['PLATFORM_ADMIN', 'CENTER_ADMIN']
const OWNER_ROLES = ['PLATFORM_OWNER']

// Our session format: base64json.hexsig (2 parts split by last dot)
function parseSessionCookie(cookieValue: string): { role?: string } | null {
  try {
    const lastDot = cookieValue.lastIndexOf('.')
    if (lastDot === -1) return null

    const payload = cookieValue.substring(0, lastDot)
    const padding = '='.repeat((4 - (payload.length % 4)) % 4)
    const json = Buffer.from(payload + padding, 'base64').toString('utf-8')
    return JSON.parse(json) as { role?: string }
  } catch {
    return null
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route))

  if (!isProtected) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get('ga_session')

  if (!sessionCookie?.value) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const session = parseSessionCookie(sessionCookie.value)

  if (!session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const isOwnerRoute = OWNER_ROUTES.some((route) => pathname.startsWith(route))

  if (isAdminRoute && !ADMIN_ROLES.includes(session.role ?? '')) {
    return NextResponse.redirect(new URL('/app', request.url))
  }

  if (isOwnerRoute && !OWNER_ROLES.includes(session.role ?? '')) {
    return NextResponse.redirect(new URL('/app', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|api/).*)',
  ],
}
