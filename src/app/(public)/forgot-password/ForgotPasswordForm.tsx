'use client'

import { useActionState } from 'react'
import { forgotPasswordAction } from './actions'

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, { error: '', success: false })

  if (state.success) {
    return (
      <div className="rounded-xl border border-green-700/40 bg-green-900/10 px-5 py-4 text-center">
        <p className="text-green-300 font-medium text-sm">Check your email!</p>
        <p className="text-slate-400 text-xs mt-1">
          If an account exists for that address, we&apos;ve sent a reset link. It expires in 1 hour.
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <div className="rounded-lg border border-red-700/30 bg-red-900/10 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
        <input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-60 transition-colors"
      >
        {pending ? 'Sending…' : 'Send Reset Link'}
      </button>
    </form>
  )
}
