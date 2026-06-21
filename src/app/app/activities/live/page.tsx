import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { LiveTracker } from './LiveTracker'

export const metadata: Metadata = {
  title: 'Record Activity | Garrincha Active',
  description: 'Track your activity live with GPS.',
}

export default async function LiveActivityPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="mx-auto max-w-2xl px-4 pb-10">
      <div className="mb-5">
        <Link
          href="/app/activities"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Activities
        </Link>
      </div>
      <LiveTracker />
    </div>
  )
}
