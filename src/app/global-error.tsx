'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
          <p className="text-slate-400 text-sm">
            An unexpected error occurred. Our team has been notified.
          </p>
          {error.digest && (
            <p className="text-xs text-slate-600 font-mono">Error ID: {error.digest}</p>
          )}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={reset}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
            >
              Try again
            </button>
            <Link
              href="/app"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
            >
              Go home
            </Link>
          </div>
        </div>
      </body>
    </html>
  )
}
