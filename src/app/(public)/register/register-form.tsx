'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { registerAction } from './actions'
import { cn } from '@/lib/utils'

export type Center = { id: string; name: string; city: string | null }

export default function RegisterForm({ centers }: { centers: Center[] }) {
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
                className={cn(fieldClass(!!state.errors.dateOfBirth), '[color-scheme:dark]')}
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
