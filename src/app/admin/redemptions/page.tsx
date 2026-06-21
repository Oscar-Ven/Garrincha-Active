import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { RedemptionStatus } from '@/generated/prisma'
import { cn, formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Redemptions — Admin' }

const PAGE_SIZE = 30

// ─── Server Actions ────────────────────────────────────────────────────────────

async function markRedemptionUsed(formData: FormData) {
  'use server'
  const admin = await getCurrentUser()
  if (!admin || admin.role !== 'PLATFORM_ADMIN') throw new Error('Unauthorized')
  const redemptionId = formData.get('redemptionId') as string
  await prisma.rewardRedemption.update({
    where: { id: redemptionId },
    data: { status: RedemptionStatus.USED, usedAt: new Date() },
  })
  revalidatePath('/admin/redemptions')
}

async function cancelRedemption(formData: FormData) {
  'use server'
  const admin = await getCurrentUser()
  if (!admin || admin.role !== 'PLATFORM_ADMIN') throw new Error('Unauthorized')
  const redemptionId = formData.get('redemptionId') as string
  await prisma.rewardRedemption.update({
    where: { id: redemptionId },
    data: { status: RedemptionStatus.CANCELLED },
  })
  revalidatePath('/admin/redemptions')
}

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: RedemptionStatus }) {
  const map: Record<RedemptionStatus, { label: string; className: string }> = {
    PENDING:   { label: 'Pending',   className: 'bg-yellow-500/15 text-yellow-400 ring-yellow-500/30' },
    USED:      { label: 'Used',      className: 'bg-primary-fixed/10 text-primary-fixed ring-primary-fixed/25' },
    CANCELLED: { label: 'Cancelled', className: 'bg-surface-container text-on-surface-variant ring-white/10' },
    EXPIRED:   { label: 'Expired',   className: 'bg-error/10 text-error ring-error/30' },
  }
  const { label, className } = map[status]
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1', className)}>
      {label}
    </span>
  )
}

// ─── Action buttons ───────────────────────────────────────────────────────────

function ActionButtons({ redemptionId, status }: { redemptionId: string; status: RedemptionStatus }) {
  if (status !== RedemptionStatus.PENDING) return null
  return (
    <div className="flex items-center gap-2">
      <form action={markRedemptionUsed}>
        <input type="hidden" name="redemptionId" value={redemptionId} />
        <button
          type="submit"
          className="inline-flex items-center gap-1 rounded-lg border border-primary-fixed/40 bg-primary-fixed/10 px-3 py-1.5 text-xs font-semibold text-primary-fixed transition-colors hover:bg-primary-fixed/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '13px', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          Mark Used
        </button>
      </form>
      <form action={cancelRedemption}>
        <input type="hidden" name="redemptionId" value={redemptionId} />
        <button
          type="submit"
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-surface-container px-3 py-1.5 text-xs font-semibold text-on-surface-variant transition-colors hover:border-error/40 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>cancel</span>
          Cancel
        </button>
      </form>
    </div>
  )
}

// ─── Status filter tabs ────────────────────────────────────────────────────────

function StatusFilterTabs({ active, counts }: { active: RedemptionStatus | 'ALL'; counts: Record<string, number> }) {
  const tabs: { label: string; value: RedemptionStatus | 'ALL' }[] = [
    { label: 'All',       value: 'ALL' },
    { label: 'Pending',   value: RedemptionStatus.PENDING },
    { label: 'Used',      value: RedemptionStatus.USED },
    { label: 'Cancelled', value: RedemptionStatus.CANCELLED },
    { label: 'Expired',   value: RedemptionStatus.EXPIRED },
  ]
  const total = Object.values(counts).reduce((s, n) => s + n, 0)

  function getCount(v: RedemptionStatus | 'ALL') { return v === 'ALL' ? total : (counts[v] ?? 0) }

  function getStyle(v: RedemptionStatus | 'ALL') {
    if (active !== v) return 'glass-card text-on-surface-variant hover:text-on-surface'
    switch (v) {
      case RedemptionStatus.PENDING:   return 'border-yellow-600 bg-yellow-600/15 text-yellow-400'
      case RedemptionStatus.USED:      return 'border-primary-fixed bg-primary-fixed/10 text-primary-fixed'
      case RedemptionStatus.CANCELLED: return 'border-white/20 bg-surface-container text-on-surface'
      case RedemptionStatus.EXPIRED:   return 'border-error bg-error/10 text-error'
      default:                         return 'border-primary-fixed bg-primary-fixed/10 text-primary-fixed'
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(({ label, value }) => {
        const count = getCount(value)
        const params = new URLSearchParams()
        if (value !== 'ALL') params.set('status', value)
        const href = params.toString() ? `/admin/redemptions?${params}` : '/admin/redemptions'
        return (
          <Link
            key={value}
            href={href}
            className={cn('flex items-center gap-2 rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors', getStyle(value))}
            aria-current={active === value ? 'page' : undefined}
          >
            {label}
            <span className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums', active === value ? 'bg-white/15' : 'bg-surface-container')}>
              {count}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

// ─── Summary pills ────────────────────────────────────────────────────────────

function SummaryPills({ counts }: { counts: Record<string, number> }) {
  const pills = [
    { label: 'Pending',   value: counts[RedemptionStatus.PENDING] ?? 0,   className: 'border-yellow-600/30 bg-yellow-600/10 text-yellow-400' },
    { label: 'Used',      value: counts[RedemptionStatus.USED] ?? 0,      className: 'border-primary-fixed/20 bg-primary-fixed/10 text-primary-fixed' },
    { label: 'Cancelled', value: counts[RedemptionStatus.CANCELLED] ?? 0, className: 'glass-card text-on-surface' },
    { label: 'Expired',   value: counts[RedemptionStatus.EXPIRED] ?? 0,   className: 'border-error/20 bg-error/10 text-error' },
  ]
  return (
    <div className="flex flex-wrap gap-3">
      {pills.map(({ label, value, className }) => (
        <div key={label} className={cn('flex items-center gap-2 rounded-lg border px-3.5 py-2', className)}>
          <span className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</span>
          <span className="text-xs font-medium opacity-75">{label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function PaginationBar({ page, total, status }: { page: number; total: number; status: RedemptionStatus | 'ALL' }) {
  const totalPages = Math.ceil(total / PAGE_SIZE)
  if (totalPages <= 1) return null

  function buildHref(p: number) {
    const params = new URLSearchParams()
    if (status !== 'ALL') params.set('status', status)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/admin/redemptions?${qs}` : '/admin/redemptions'
  }

  const half = 2
  const start = Math.max(1, Math.min(page - half, totalPages - 4))
  const end = Math.min(totalPages, start + 4)
  const pages: number[] = []
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <nav className="flex items-center justify-between gap-4 border-t border-white/10 pt-5">
      <p className="text-sm text-on-surface-variant">
        Page <span className="font-semibold text-on-surface">{page}</span> of{' '}
        <span className="font-semibold text-on-surface">{totalPages}</span>
        {' '}·{' '}
        <span className="font-semibold text-on-surface">{total.toLocaleString()}</span> total
      </p>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link href={buildHref(page - 1)} className="glass-card flex h-9 w-9 items-center justify-center rounded-lg border text-on-surface-variant transition-colors hover:text-on-surface">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_left</span>
          </Link>
        ) : (
          <span className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg border border-white/5 text-on-surface-variant/30">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_left</span>
          </span>
        )}
        {pages.map((p) =>
          p === page ? (
            <span key={p} className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary-fixed bg-primary-fixed/10 text-sm font-semibold text-primary-fixed">{p}</span>
          ) : (
            <Link key={p} href={buildHref(p)} className="glass-card flex h-9 w-9 items-center justify-center rounded-lg border text-sm text-on-surface-variant transition-colors hover:text-on-surface">{p}</Link>
          ),
        )}
        {page < totalPages ? (
          <Link href={buildHref(page + 1)} className="glass-card flex h-9 w-9 items-center justify-center rounded-lg border text-on-surface-variant transition-colors hover:text-on-surface">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
          </Link>
        ) : (
          <span className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg border border-white/5 text-on-surface-variant/30">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
          </span>
        )}
      </div>
    </nav>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>
}

export default async function AdminRedemptionsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'PLATFORM_ADMIN' && user.role !== 'CENTER_ADMIN') redirect('/app')

  const params = await searchParams
  const rawStatus = params.status?.toUpperCase()
  const validStatuses = Object.values(RedemptionStatus) as string[]
  const activeStatus: RedemptionStatus | 'ALL' =
    rawStatus && validStatuses.includes(rawStatus) ? (rawStatus as RedemptionStatus) : 'ALL'
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  const where = activeStatus === 'ALL' ? {} : { status: activeStatus }

  const [redemptions, total, groupCounts] = await Promise.all([
    prisma.rewardRedemption.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
        reward: { select: { id: true, title: true, category: true, pointsCost: true } },
      },
    }),
    prisma.rewardRedemption.count({ where }),
    prisma.rewardRedemption.groupBy({ by: ['status'], _count: { id: true } }),
  ])

  const counts: Record<string, number> = {}
  for (const row of groupCounts) { counts[row.status] = row._count.id }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Redemptions</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Track and manage reward redemptions across all players.</p>
      </div>

      <SummaryPills counts={counts} />
      <StatusFilterTabs active={activeStatus} counts={counts} />

      {/* ── Table ── */}
      {redemptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-surface-container py-16 text-center">
          <span className="material-symbols-outlined text-on-surface-variant/40" style={{ fontSize: '40px' }}>redeem</span>
          <p className="text-sm font-semibold text-on-surface">No redemptions found</p>
          <p className="text-xs text-on-surface-variant">There are no redemptions matching this filter.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden rounded-xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-surface-container">
                  {['Player', 'Reward', 'Code', 'Points', 'Status', 'Redeemed At', 'Used At', 'Actions'].map((col) => (
                    <th key={col} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {redemptions.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-surface-container-high">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="shrink-0">
                          {r.user.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-white/20" />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed/10 text-xs font-bold text-primary-fixed ring-1 ring-white/20">
                              {r.user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/admin/players/${r.user.id}`} className="block truncate font-medium text-on-surface max-w-28 hover:text-primary-fixed">
                            {r.user.name}
                          </Link>
                          <p className="truncate text-xs text-on-surface-variant max-w-28">@{r.user.nickname}</p>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-44 px-4 py-3">
                      <p className="truncate font-medium text-on-surface">{r.reward.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-surface-container-highest px-2 py-0.5 font-mono text-xs text-on-surface">
                        {r.redemptionCode}
                      </code>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-semibold text-[#FFD700] tabular-nums">{r.pointsSpent.toLocaleString()}</span>
                      <span className="ml-1 text-xs text-on-surface-variant">pts</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-on-surface-variant">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-on-surface-variant">
                      {r.usedAt ? formatDate(r.usedAt) : <span className="text-on-surface-variant/30">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <ActionButtons redemptionId={r.id} status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {total > PAGE_SIZE && <PaginationBar page={page} total={total} status={activeStatus} />}
    </div>
  )
}
