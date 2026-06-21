import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getMatchesForUser } from '@/services/matches'
import { MatchCard } from '@/components/matches/match-card'
import { MatchStatus } from '@/generated/prisma'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'My Matches | GG' }

const STATUS_TABS: { label: string; value: MatchStatus | 'ALL'; key: string }[] = [
  { label: 'All', value: 'ALL', key: 'all' },
  { label: 'Pending', value: MatchStatus.PENDING, key: 'pending' },
  { label: 'Confirmed', value: MatchStatus.CONFIRMED, key: 'confirmed' },
  { label: 'Disputed', value: MatchStatus.DISPUTED, key: 'disputed' },
]

const PAGE_SIZE = 20

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { page: pageParam, status: statusParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10))
  const statusFilter = STATUS_TABS.find(
    (t) => t.key === statusParam && t.value !== 'ALL',
  )?.value as MatchStatus | undefined

  const { matches, total } = await getMatchesForUser(user.id, {
    page,
    limit: PAGE_SIZE,
    ...(statusFilter ? { status: statusFilter } : {}),
  })
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="max-w-2xl mx-auto space-y-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-md text-on-surface">My Matches</h1>
          <p className="text-label-caps text-on-surface-variant mt-xs">{total} recorded</p>
        </div>
        <Link
          href="/app/matches/new"
          className="bg-primary-fixed text-on-primary-fixed px-md py-sm rounded-full font-bold text-label-caps action-glow hover:scale-105 active:scale-95 transition-all flex items-center gap-xs"
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
          >
            add_circle
          </span>
          Record
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-xs glass-card rounded-xl p-xs">
        {STATUS_TABS.map((tab) => {
          const isActive = (statusParam ?? 'all') === tab.key
          const href =
            tab.value === 'ALL' ? '/app/matches' : `/app/matches?status=${tab.key}`
          return (
            <Link
              key={tab.key}
              href={href}
              className={cn(
                'flex-1 rounded-lg px-md py-xs text-label-caps text-center transition-colors',
                isActive
                  ? 'bg-primary-fixed text-on-primary-fixed'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Match list */}
      {matches.length === 0 ? (
        <div className="glass-card rounded-xl p-md py-12 flex flex-col items-center text-center">
          <span
            className="material-symbols-outlined text-on-surface-variant mb-sm"
            style={{ fontSize: '40px' }}
          >
            sports_kabaddi
          </span>
          <p className="text-body-md text-on-surface-variant">No matches yet</p>
          <Link
            href="/app/matches/new"
            className="text-label-caps text-primary-fixed mt-sm hover:opacity-80"
          >
            Record your first match →
          </Link>
        </div>
      ) : (
        <div className="space-y-sm">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} currentUserId={user.id} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-md">
          {page > 1 && (
            <Link
              href={`/app/matches?page=${page - 1}${statusParam ? `&status=${statusParam}` : ''}`}
              className="text-label-caps text-on-surface-variant hover:text-on-surface glass-card px-md py-xs rounded-full"
            >
              Previous
            </Link>
          )}
          <span className="text-label-caps text-on-surface-variant">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/app/matches?page=${page + 1}${statusParam ? `&status=${statusParam}` : ''}`}
              className="text-label-caps text-on-surface-variant hover:text-on-surface glass-card px-md py-xs rounded-full"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
