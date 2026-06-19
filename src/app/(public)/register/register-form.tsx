'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { registerAction } from './actions'
import { cn } from '@/lib/utils'

export type Center = { id: string; name: string; city: string | null }

export default function RegisterForm({
  centers,
  initialReferralCode = '',
}: {
  centers: Center[]
  initialReferralCode?: string
}) {
  const [state, formAction, pending] = useActionState(registerAction, {
    errors: {},
    values: {},
  })

  const fieldClass = (hasError: boolean) =>
    cn(
      'w-full rounded-lg border bg-slate-800 px-3 py-3 text-base text-white placeholder:text-slate-500',
      'focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-colors',
      hasError
        ? 'border-red-500 focus:ring-red-500'
        : 'border-slate-700 hover:border-slate-600'
    )

  const labelClass = 'block text-sm font-medium text-slate-300 mb-1.5'
  const errorClass = 'mt-1 text-xs text-red-400'

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="h-9 w-9 rounded-full bg-green-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">GA</span>
            </div>
            <span className="text-white font-bold text-xl">Garrincha Active</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="mt-2 text-sm text-slate-400">
            Join the platform. Track activities, earn rewards, and compete.
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
          {state.errors._form && (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {state.errors._form}
            </div>
          )}

          {/* Google OAuth button */}
          <a
            href="/api/auth/google"
            className="flex items-center justify-center gap-3 w-full rounded-xl border border-slate-600 bg-slate-900 hover:bg-slate-700 px-4 py-3 text-sm font-medium text-slate-200 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </a>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-slate-800/50 px-3 text-xs text-slate-500">or register with email</span>
            </div>
          </div>

          <form action={formAction} noValidate className="space-y-5">
            {/* Full Name */}
            <div>
              <label htmlFor="name" className={labelClass}>
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                defaultValue={state.values?.name ?? ''}
                className={fieldClass(!!state.errors.name)}
                placeholder="Mohamed Al Rashid"
              />
              {state.errors.name && (
                <p className={errorClass}>{state.errors.name}</p>
              )}
            </div>

            {/* Nickname */}
            <div>
              <label htmlFor="nickname" className={labelClass}>
                Nickname
              </label>
              <input
                id="nickname"
                name="nickname"
                type="text"
                autoComplete="username"
                defaultValue={state.values?.nickname ?? ''}
                className={fieldClass(!!state.errors.nickname)}
                placeholder="mohamedal99"
              />
              {state.errors.nickname && (
                <p className={errorClass}>{state.errors.nickname}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className={labelClass}>
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={state.values?.email ?? ''}
                className={fieldClass(!!state.errors.email)}
                placeholder="you@example.com"
              />
              {state.errors.email && (
                <p className={errorClass}>{state.errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className={labelClass}>
                Phone Number{' '}
                <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                defaultValue={state.values?.phone ?? ''}
                className={fieldClass(!!state.errors.phone)}
                placeholder="+966 50 000 0000"
              />
              {state.errors.phone && (
                <p className={errorClass}>{state.errors.phone}</p>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="dateOfBirth" className={labelClass}>
                Date of Birth
              </label>
              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                defaultValue={state.values?.dateOfBirth ?? ''}
                className={cn(fieldClass(!!state.errors.dateOfBirth), 'scheme-dark')}
              />
              {state.errors.dateOfBirth && (
                <p className={errorClass}>{state.errors.dateOfBirth}</p>
              )}
            </div>

            {/* Two-column row: Center + Favorite Sport */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Center */}
              <div>
                <label htmlFor="centerId" className={labelClass}>
                  Sports Center{' '}
                  <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <select
                    id="centerId"
                    name="centerId"
                    defaultValue={state.values?.centerId ?? ''}
                    className={cn(
                      fieldClass(!!state.errors.centerId),
                      'appearance-none cursor-pointer pr-8'
                    )}
                  >
                    <option value="">— No center —</option>
                    {centers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.city ? ` (${c.city})` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
                    <svg
                      className="h-4 w-4 text-slate-400"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 6l4 4 4-4"
                      />
                    </svg>
                  </div>
                </div>
                {state.errors.centerId && (
                  <p className={errorClass}>{state.errors.centerId}</p>
                )}
              </div>

              {/* Favorite Sport */}
              <div>
                <label htmlFor="favoriteSport" className={labelClass}>
                  Favorite Sport
                </label>
                <div className="relative">
                  <select
                    id="favoriteSport"
                    name="favoriteSport"
                    defaultValue={state.values?.favoriteSport ?? ''}
                    className={cn(
                      fieldClass(!!state.errors.favoriteSport),
                      'appearance-none cursor-pointer pr-8'
                    )}
                  >
                    <option value="">— Select sport —</option>
                    <option value="Football">Football</option>
                    <option value="Running">Running</option>
                    <option value="Cycling">Cycling</option>
                    <option value="Fitness">Fitness</option>
                    <option value="Multi-sport">Multi-sport</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
                    <svg
                      className="h-4 w-4 text-slate-400"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 6l4 4 4-4"
                      />
                    </svg>
                  </div>
                </div>
                {state.errors.favoriteSport && (
                  <p className={errorClass}>{state.errors.favoriteSport}</p>
                )}
              </div>
            </div>

            {/* Referral Code */}
            <div>
              <label htmlFor="referralCode" className={labelClass}>
                Referral Code{' '}
                <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <input
                id="referralCode"
                name="referralCode"
                type="text"
                autoComplete="off"
                defaultValue={state.values?.referralCode ?? initialReferralCode}
                className={fieldClass(!!state.errors.referralCode)}
                placeholder="e.g. mohamedal99abc123"
              />
              {state.errors.referralCode && (
                <p className={errorClass}>{state.errors.referralCode}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                Have a friend&apos;s referral code? Enter it to earn 50 welcome points.
              </p>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className={labelClass}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                className={fieldClass(!!state.errors.password)}
                placeholder="At least 8 characters"
              />
              {state.errors.password && (
                <p className={errorClass}>{state.errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className={labelClass}>
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                className={fieldClass(!!state.errors.confirmPassword)}
                placeholder="Repeat your password"
              />
              {state.errors.confirmPassword && (
                <p className={errorClass}>{state.errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={pending}
              className={cn(
                'mt-2 w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white',
                'hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 focus:ring-offset-slate-800',
                'transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
              )}
            >
              {pending ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-green-500 hover:text-green-400 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
