import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { createSession, verifyPassword, SESSION_COOKIE_NAME } from '@/lib/auth'
import LoginForm from './LoginForm'

const MAX_AGE = 60 * 60 * 24 * 7 // 7 days

async function loginAction(formData: FormData): Promise<{ error: string } | never> {
  'use server'

  const email = (formData.get('email') as string | null)?.trim().toLowerCase() ?? ''
  const password = (formData.get('password') as string | null) ?? ''

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !user.isActive) {
    return { error: 'Invalid email or password.' }
  }

  const passwordValid = await verifyPassword(password, user.passwordHash)

  if (!passwordValid) {
    return { error: 'Invalid email or password.' }
  }

  const cookieHeader = createSession({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    nickname: user.nickname,
  })

  // createSession returns a Set-Cookie header string; extract just the token value
  const tokenValue = cookieHeader.split(';')[0].replace(`${SESSION_COOKIE_NAME}=`, '')

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, tokenValue, {
    httpOnly: true,
    path: '/',
    maxAge: MAX_AGE,
    sameSite: 'lax',
  })

  redirect('/app')
}

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-600 mb-4">
            <svg
              className="w-9 h-9 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a10 10 0 0 1 7.07 17.07" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Garrincha Active</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl p-8">
          {/* Search-param error (e.g. redirected here with ?error=...) */}
          {error && (
            <div className="mb-5 rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
              {decodeURIComponent(error)}
            </div>
          )}

          <LoginForm action={loginAction} />

          {/* Forgot password */}
          <div className="mt-4 text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-slate-400 hover:text-green-400 transition-colors"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        {/* Register link */}
        <p className="mt-6 text-center text-sm text-slate-400">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-medium text-green-400 hover:text-green-300 transition-colors"
          >
            Create one free
          </Link>
        </p>
      </div>
    </div>
  )
}
