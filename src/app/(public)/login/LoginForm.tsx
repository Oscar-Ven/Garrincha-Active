'use client'

import { useActionState } from 'react'
import { cn } from '@/lib/utils'

interface ActionResult {
  error: string
}

interface LoginFormProps {
  action: (formData: FormData) => Promise<ActionResult | never>
}

export default function LoginForm({ action }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    async (_prev: ActionResult | null, formData: FormData) => {
      const result = await action(formData)
      return result ?? null
    },
    null,
  )

  return (
    <form action={formAction} noValidate className="space-y-5">
      {/* Inline server-action error */}
      {state?.error && (
        <div className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      )}

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isPending}
          className={cn(
            'w-full rounded-xl bg-slate-900 border border-slate-600 text-white placeholder-slate-500',
            'px-4 py-3 text-base outline-none',
            'focus:border-green-500 focus:ring-2 focus:ring-green-500/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
          placeholder="you@example.com"
        />
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={isPending}
          className={cn(
            'w-full rounded-xl bg-slate-900 border border-slate-600 text-white placeholder-slate-500',
            'px-4 py-3 text-base outline-none',
            'focus:border-green-500 focus:ring-2 focus:ring-green-500/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
          placeholder="••••••••"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className={cn(
          'w-full rounded-xl bg-green-600 hover:bg-green-500 active:bg-green-700',
          'text-white font-semibold text-sm py-2.5 px-4',
          'focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-slate-800',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          'flex items-center justify-center gap-2',
        )}
      >
        {isPending ? (
          <>
            <svg
              className="w-4 h-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Signing in…
          </>
        ) : (
          'Sign in'
        )}
      </button>
    </form>
  )
}
