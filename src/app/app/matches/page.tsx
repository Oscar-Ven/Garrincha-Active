import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getMatchesForUser } from '@/services/matches'
import { MatchCard } from '@/components/matches/match-card'

export const metadata: Metadata = {
  title: 'My Matches',
  description: 'View your match history and results.',
}

const PAGE_SIZE = 20

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10))

  const { matches, total } = await getMatchesForUser(user.id, { page, limit: PAGE_SIZE })
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Matches</h1>
          <p className="text-white/50 text-sm mt-1">{total} match{total !== 1 ? 'es' : ''} recorded</p>
        </div>
        <Link
          href="/app/matches/new"
          className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors"
        >
          + Record Match
        </Link>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <p className="text-white/50 text-lg">No matches yet</p>
          <p className="text-white/30 text-sm mt-1">Record your first match to start building your rating</p>
          <Link
            href="/app/matches/new"
            className="inline-block mt-4 px-6 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors"
          >
            Record a match
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} currentUserId={user.id} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          {page > 1 && (
            <Link
              href={`/app/matches?page=${page - 1}`}
              className="px-3 py-1.5 rounded-lg border border-white/20 text-white/70 hover:text-white text-sm transition-colors"
            >
              Previous
            </Link>
          )}
          <span className="text-white/40 text-sm">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/app/matches?page=${page + 1}`}
              className="px-3 py-1.5 rounded-lg border border-white/20 text-white/70 hover:text-white text-sm transition-colors"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
