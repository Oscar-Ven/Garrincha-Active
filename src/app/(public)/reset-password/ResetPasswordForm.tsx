'use client'

import { useActionState } from 'react'
import { resetPasswordAction } from './actions'
import Link from 'next/link'

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction.bind(null, token), { error: '', success: false })

  if (state.success) {
    return (
      <div className="rounded-xl border border-green-700/40 bg-green-900/10 px-5 py-4 text-center space-y-3">
        <p className="text-green-300 font-medium">Password updated!</p>
        <Link href="/login" className="block text-sm text-green-400 hover:underline">
          Sign in with your new password →
        </Link>
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
        <label className="block text-sm font-medium text-slate-300 mb-1.5">New password</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Min. 8 characters"
          className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm password</label>
        <input
          name="confirmPassword"
          type="password"
          required
          placeholder="Repeat password"
          className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-60 transition-colors"
      >
        {pending ? 'Updating…' : 'Update Password'}
      </button>
    </form>
  )
}
