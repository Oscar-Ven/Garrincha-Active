import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { cn, formatDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Players — Garrincha Admin',
  description: 'Manage all registered players on the Garrincha Active platform.',
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25

// ─── Helpers ─────────────────────────────────────────────────────────────────

function roleBadgeClass(role: string): string {
  switch (role) {
    case 'PLATFORM_ADMIN': return 'border-error/40 bg-error/10 text-error'
    case 'CENTER_ADMIN':   return 'border-[#FFD700]/40 bg-[#FFD700]/10 text-[#FFD700]'
    case 'SPONSOR_ADMIN':  return 'border-secondary/40 bg-secondary/10 text-secondary'
    default:               return 'glass-card text-on-surface-variant'
  }
}

function roleLabel(role: string): string {
  switch (role) {
    case 'PLATFORM_ADMIN': return 'Platform Admin'
    case 'CENTER_ADMIN':   return 'Center Admin'
    case 'SPONSOR_ADMIN':  return 'Sponsor Admin'
    default:               return 'Player'
  }
}

function levelBadgeClass(level: string | undefined | null): string {
  switch (level) {
    case 'ELITE':  return 'border-purple-600/40 bg-purple-600/10 text-purple-400'
    case 'GOLD':   return 'border-[#FFD700]/40 bg-[#FFD700]/10 text-[#FFD700]'
    case 'SILVER': return 'border-white/10 bg-surface-container text-on-surface'
    default:       return 'border-amber-700/40 bg-amber-700/10 text-amber-600'
  }
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getPageData(search: string, centerId: string, page: number) {
  const skip = (page - 1) * PAGE_SIZE

  const where = {
    ...(search
      ? {
          OR: [
            { name:     { contains: search } },
            { nickname: { contains: search } },
            { email:    { contains: search } },
          ],
        }
      : {}),
    ...(centerId ? { centerId } : {}),
  }

  const [users, total, centers] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      select: {
        id:        true,
        name:      true,
        nickname:  true,
        email:     true,
        role:      true,
        avatarUrl: true,
        isActive:  true,
        createdAt: true,
        center: {
          select: { id: true, name: true },
        },
        playerProfile: {
          select: {
            level:       true,
            totalPoints: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
    prisma.center.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  return { users, total, centers }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlayerAvatar({
  avatarUrl,
  name,
}: {
  avatarUrl: string | null
  name: string
}) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/10"
      />
    )
  }

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-highest text-xs font-semibold text-on-surface ring-1 ring-white/10">
      {initials || '?'}
    </span>
  )
}

function SearchForm({ search, centerId }: { search: string; centerId: string }) {
  return (
    <form method="GET" className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1 min-w-0">
        <span
          className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          aria-hidden="true"
          style={{ fontSize: '16px' }}
        >
          search
        </span>
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="Search by name, nickname or email…"
          className="w-full glass-card rounded-lg border border-white/10 py-2 pl-9 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant transition-colors focus:border-primary-fixed focus:outline-none focus:ring-1 focus:ring-primary-fixed"
        />
      </div>

      {centerId && <input type="hidden" name="center" value={centerId} />}

      <button
        type="submit"
        className="shrink-0 rounded-lg bg-primary-fixed px-4 py-2 text-sm font-semibold text-on-primary-fixed transition-colors hover:bg-primary-fixed-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
      >
        Search
      </button>
    </form>
  )
}

function CenterFilter({
  centers,
  activeCenterId,
  search,
}: {
  centers: { id: string; name: string }[]
  activeCenterId: string
  search: string
}) {
  function buildHref(id: string) {
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (id)     p.set('center', id)
    const qs = p.toString()
    return qs ? `/admin/players?${qs}` : '/admin/players'
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by center">
      <Link
        href={buildHref('')}
        className={cn(
          'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed',
          !activeCenterId
            ? 'border-primary-fixed bg-primary-fixed/10 text-primary-fixed'
            : 'glass-card text-on-surface-variant hover:text-on-surface',
        )}
      >
        All Centers
      </Link>
      {centers.map((c) => (
        <Link
          key={c.id}
          href={buildHref(c.id)}
          className={cn(
            'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed',
            activeCenterId === c.id
              ? 'border-primary-fixed bg-primary-fixed/10 text-primary-fixed'
              : 'glass-card text-on-surface-variant hover:text-on-surface',
          )}
        >
          {c.name}
        </Link>
      ))}
    </div>
  )
}

function Pagination({
  page,
  total,
  search,
  centerId,
}: {
  page: number
  total: number
  search: string
  centerId: string
}) {
  const totalPages = Math.ceil(total / PAGE_SIZE)
  if (totalPages <= 1) return null

  function buildHref(p: number) {
    const params = new URLSearchParams()
    if (search)   params.set('search', search)
    if (centerId) params.set('center', centerId)
    if (p > 1)    params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/admin/players?${qs}` : '/admin/players'
  }

  const windowSize = 5
  const half = Math.floor(windowSize / 2)
  let start = Math.max(1, page - half)
  const end = Math.min(totalPages, start + windowSize - 1)
  if (end - start < windowSize - 1) start = Math.max(1, end - windowSize + 1)

  const pageNumbers: number[] = []
  for (let i = start; i <= end; i++) pageNumbers.push(i)

  const prevPage = page > 1 ? page - 1 : null
  const nextPage = page < totalPages ? page + 1 : null

  return (
    <nav
      className="flex items-center justify-between gap-4 border-t border-white/10 pt-5"
      aria-label="Pagination"
    >
      <p className="text-sm text-on-surface-variant">
        Page <span className="font-semibold text-on-surface">{page}</span> of{' '}
        <span className="font-semibold text-on-surface">{totalPages}</span>
        <span className="hidden sm:inline">
          {' '}—{' '}
          <span className="font-semibold text-on-surface">{total.toLocaleString()}</span>{' '}
          players
        </span>
      </p>

      <div className="flex items-center gap-1">
        {prevPage ? (
          <Link
            href={buildHref(prevPage)}
            aria-label="Previous page"
            className="flex h-8 w-8 items-center justify-center rounded-md glass-card border text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_left</span>
          </Link>
        ) : (
          <span
            aria-disabled="true"
            aria-label="Previous page"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-white/5 text-on-surface-variant/30 cursor-not-allowed"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_left</span>
          </span>
        )}

        {pageNumbers.map((p) =>
          p === page ? (
            <span
              key={p}
              aria-current="page"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-primary-fixed bg-primary-fixed/10 text-xs font-semibold text-primary-fixed"
            >
              {p}
            </span>
          ) : (
            <Link
              key={p}
              href={buildHref(p)}
              className="flex h-8 w-8 items-center justify-center rounded-md glass-card border text-xs text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed"
            >
              {p}
            </Link>
          ),
        )}

        {nextPage ? (
          <Link
            href={buildHref(nextPage)}
            aria-label="Next page"
            className="flex h-8 w-8 items-center justify-center rounded-md glass-card border text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
          </Link>
        ) : (
          <span
            aria-disabled="true"
            aria-label="Next page"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-white/5 text-on-surface-variant/30 cursor-not-allowed"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
          </span>
        )}
      </div>
    </nav>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{
    search?: string
    center?: string
    page?: string
  }>
}

export default async function AdminPlayersPage({ searchParams }: PageProps) {
  const currentUser = await getCurrentUser()
  if (!currentUser) redirect('/login')
  if (currentUser.role !== 'PLATFORM_ADMIN' && currentUser.role !== 'CENTER_ADMIN') {
    redirect('/app')
  }

  const params    = await searchParams
  const search    = (params.search ?? '').trim()
  const centerId  = params.center ?? ''
  const page      = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  const { users, total, centers } = await getPageData(search, centerId, page)

  const from = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0
  const to   = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed/10 text-primary-fixed">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>group</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-on-surface">Players</h1>
            <p className="text-sm text-on-surface-variant">
              {total.toLocaleString()} registered account{total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="glass-card space-y-4 rounded-xl border p-4">
        <SearchForm search={search} centerId={centerId} />
        {centers.length > 0 && (
          <CenterFilter
            centers={centers}
            activeCenterId={centerId}
            search={search}
          />
        )}
      </div>

      {/* ── Results count ── */}
      {total > 0 && (
        <p className="text-sm text-on-surface-variant">
          Showing{' '}
          <span className="font-semibold text-on-surface">{from}–{to}</span>
          {' '}of{' '}
          <span className="font-semibold text-on-surface">{total.toLocaleString()}</span>
          {search && (
            <>
              {' '}for{' '}
              <span className="font-semibold text-on-surface">&ldquo;{search}&rdquo;</span>
            </>
          )}
          {centerId && centers.find((c) => c.id === centerId) && (
            <>
              {' '}in{' '}
              <span className="font-semibold text-on-surface">
                {centers.find((c) => c.id === centerId)!.name}
              </span>
            </>
          )}
        </p>
      )}

      {/* ── Table / empty state ── */}
      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed glass-card px-6 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>group</span>
          </div>
          <div>
            <p className="text-base font-semibold text-on-surface">No players found</p>
            <p className="mt-1 text-sm text-on-surface-variant">
              {search || centerId
                ? 'Try adjusting your search or filter criteria.'
                : 'No players have registered yet.'}
            </p>
          </div>
          {(search || centerId) && (
            <Link
              href="/admin/players"
              className="glass-card rounded-lg border px-4 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high"
            >
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-215 text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-surface-container">
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Player</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Email</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Center</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Role</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Level</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Points</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Status</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="group relative bg-surface-container-lowest transition-colors hover:bg-surface-container cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <PlayerAvatar avatarUrl={user.avatarUrl} name={user.name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-on-surface">
                            {user.name}
                          </p>
                          <p className="truncate text-xs text-on-surface-variant">@{user.nickname}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-on-surface-variant">
                      {user.email}
                    </td>

                    <td className="px-4 py-3">
                      {user.center ? (
                        <span className="truncate text-on-surface">{user.center.name}</span>
                      ) : (
                        <span className="text-on-surface-variant/40">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', roleBadgeClass(user.role))}>
                        {roleLabel(user.role)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {user.playerProfile ? (
                        <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', levelBadgeClass(user.playerProfile.level))}>
                          {user.playerProfile.level}
                        </span>
                      ) : (
                        <span className="text-on-surface-variant/40">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums">
                      {user.playerProfile != null ? (
                        <span className="font-semibold text-[#FFD700]">
                          {user.playerProfile.totalPoints.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-on-surface-variant/40">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-fixed">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary-fixed" aria-hidden="true" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-error">
                          <span className="h-1.5 w-1.5 rounded-full bg-error" aria-hidden="true" />
                          Inactive
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-on-surface-variant">
                      {formatDate(user.createdAt, 'MMM d, yyyy')}
                    </td>

                    <td className="p-0">
                      <Link
                        href={`/admin/players/${user.id}`}
                        className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-fixed"
                        aria-label={`View player ${user.name}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {total > PAGE_SIZE && (
        <Pagination
          page={page}
          total={total}
          search={search}
          centerId={centerId}
        />
      )}
    </div>
  )
}
