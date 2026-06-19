import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Level, PointsSourceType, RedemptionStatus } from '@/generated/prisma'
import { cn, formatDate, getLevelColor } from '@/lib/utils'
import { LEVEL_THRESHOLDS } from '@/lib/points-rules'

export const metadata: Metadata = {
  title: 'My Wallet',
  description: 'Your points balance, earning history, and reward redemptions.',
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getWalletData(userId: string) {
  const [profile, ledger, redemptions] = await Promise.all([
    prisma.playerProfile.findUnique({
      where: { userId },
      select: {
        totalPoints: true,
        lifetimePoints: true,
        level: true,
      },
    }),
    prisma.pointsLedger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.rewardRedemption.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        reward: {
          select: {
            title: true,
            category: true,
            imageUrl: true,
          },
        },
      },
    }),
  ])

  return { profile, ledger, redemptions }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLevelLabel(level: Level): string {
  switch (level) {
    case Level.BRONZE:
      return 'Bronze'
    case Level.SILVER:
      return 'Silver'
    case Level.GOLD:
      return 'Gold'
    case Level.ELITE:
      return 'Elite'
    default:
      return 'Bronze'
  }
}

function getNextLevelInfo(
  currentPoints: number,
  level: Level,
): { nextLevel: Level | null; nextThreshold: number; prevThreshold: number } {
  if (level === Level.BRONZE) {
    return { nextLevel: Level.SILVER, nextThreshold: LEVEL_THRESHOLDS.SILVER, prevThreshold: 0 }
  }
  if (level === Level.SILVER) {
    return { nextLevel: Level.GOLD, nextThreshold: LEVEL_THRESHOLDS.GOLD, prevThreshold: LEVEL_THRESHOLDS.SILVER }
  }
  if (level === Level.GOLD) {
    return { nextLevel: Level.ELITE, nextThreshold: LEVEL_THRESHOLDS.ELITE, prevThreshold: LEVEL_THRESHOLDS.GOLD }
  }
  return { nextLevel: null, nextThreshold: LEVEL_THRESHOLDS.ELITE, prevThreshold: LEVEL_THRESHOLDS.ELITE }
}

function levelBadgeBg(level: Level): string {
  switch (level) {
    case Level.BRONZE:
      return 'bg-amber-700/20 ring-amber-700/40 text-amber-600'
    case Level.SILVER:
      return 'bg-slate-400/10 ring-slate-400/30 text-slate-300'
    case Level.GOLD:
      return 'bg-yellow-500/15 ring-yellow-500/30 text-yellow-400'
    case Level.ELITE:
      return 'bg-emerald-500/15 ring-emerald-500/30 text-emerald-400'
    default:
      return 'bg-amber-700/20 ring-amber-700/40 text-amber-600'
  }
}

function levelProgressBarColor(level: Level): string {
  switch (level) {
    case Level.BRONZE:
      return 'bg-amber-600'
    case Level.SILVER:
      return 'bg-slate-300'
    case Level.GOLD:
      return 'bg-yellow-400'
    case Level.ELITE:
      return 'bg-emerald-400'
    default:
      return 'bg-amber-600'
  }
}

function sourceTypeLabel(type: PointsSourceType): string {
  switch (type) {
    case PointsSourceType.ACTIVITY:
      return 'Activity'
    case PointsSourceType.CHALLENGE_COMPLETION:
      return 'Challenge'
    case PointsSourceType.EVENT_ATTENDANCE:
      return 'Event'
    case PointsSourceType.BADGE_AWARD:
      return 'Badge'
    case PointsSourceType.ADMIN_BONUS:
      return 'Admin Bonus'
    case PointsSourceType.REDEMPTION_DEBIT:
      return 'Redemption'
    case PointsSourceType.REFERRAL:
      return 'Referral'
    case PointsSourceType.CUSTOM:
      return 'Custom'
    default:
      return 'Points'
  }
}

function sourceTypePill(type: PointsSourceType): string {
  switch (type) {
    case PointsSourceType.ACTIVITY:
      return 'bg-green-600/10 text-green-400 ring-green-600/20'
    case PointsSourceType.CHALLENGE_COMPLETION:
      return 'bg-blue-600/10 text-blue-400 ring-blue-600/20'
    case PointsSourceType.EVENT_ATTENDANCE:
      return 'bg-purple-600/10 text-purple-400 ring-purple-600/20'
    case PointsSourceType.BADGE_AWARD:
      return 'bg-yellow-600/10 text-yellow-400 ring-yellow-600/20'
    case PointsSourceType.ADMIN_BONUS:
      return 'bg-cyan-600/10 text-cyan-400 ring-cyan-600/20'
    case PointsSourceType.REDEMPTION_DEBIT:
      return 'bg-red-600/10 text-red-400 ring-red-600/20'
    case PointsSourceType.REFERRAL:
      return 'bg-orange-600/10 text-orange-400 ring-orange-600/20'
    case PointsSourceType.CUSTOM:
      return 'bg-slate-600/10 text-slate-400 ring-slate-600/20'
    default:
      return 'bg-slate-600/10 text-slate-400 ring-slate-600/20'
  }
}

function redemptionStatusLabel(status: RedemptionStatus): string {
  switch (status) {
    case RedemptionStatus.PENDING:
      return 'Pending'
    case RedemptionStatus.USED:
      return 'Used'
    case RedemptionStatus.CANCELLED:
      return 'Cancelled'
    case RedemptionStatus.EXPIRED:
      return 'Expired'
  }
}

function redemptionStatusStyle(status: RedemptionStatus): string {
  switch (status) {
    case RedemptionStatus.PENDING:
      return 'bg-yellow-600/10 text-yellow-400 ring-yellow-600/20'
    case RedemptionStatus.USED:
      return 'bg-green-600/10 text-green-400 ring-green-600/20'
    case RedemptionStatus.CANCELLED:
      return 'bg-slate-600/10 text-slate-400 ring-slate-600/20'
    case RedemptionStatus.EXPIRED:
      return 'bg-red-600/10 text-red-400 ring-red-600/20'
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BalanceCard({
  totalPoints,
  lifetimePoints,
  level,
}: {
  totalPoints: number
  lifetimePoints: number
  level: Level
}) {
  const { nextLevel, nextThreshold, prevThreshold } = getNextLevelInfo(totalPoints, level)

  const rangeSize = nextThreshold - prevThreshold
  const progressInRange = Math.min(totalPoints - prevThreshold, rangeSize)
  const progressPct = rangeSize > 0 ? Math.round((progressInRange / rangeSize) * 100) : 100
  const remaining = nextLevel ? Math.max(0, nextThreshold - totalPoints) : 0

  return (
    <div className="rounded-2xl border border-slate-700 bg-linear-to-br from-slate-800 to-slate-800/60 p-6 ring-1 ring-slate-700/50 shadow-xl">
      {/* Top row: balance + level badge */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400 mb-1">Available Points</p>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-extrabold tabular-nums text-white leading-none">
              {totalPoints.toLocaleString()}
            </span>
            <span className="mb-1 text-lg font-semibold text-yellow-400">pts</span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Lifetime earned:{' '}
            <span className="font-semibold text-slate-300">{lifetimePoints.toLocaleString()} pts</span>
          </p>
        </div>

        {/* Level badge */}
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 ring-1 text-sm font-bold uppercase tracking-widest',
            levelBadgeBg(level),
          )}
        >
          <svg
            className="h-4 w-4"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          {getLevelLabel(level)}
        </div>
      </div>

      {/* Level progress bar */}
      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{getLevelLabel(level)}</span>
          {nextLevel ? (
            <span>{getLevelLabel(nextLevel)}</span>
          ) : (
            <span className="text-emerald-400 font-semibold">Max Level</span>
          )}
        </div>

        <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-700">
          <div
            className={cn('h-full rounded-full transition-all', levelProgressBarColor(level))}
            style={{ width: `${progressPct}%` }}
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Level progress"
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">{progressPct}% complete</span>
          {nextLevel ? (
            <span className="text-slate-400">
              <span className={cn('font-semibold', getLevelColor(level))}>
                {remaining.toLocaleString()} pts
              </span>{' '}
              to {getLevelLabel(nextLevel)}
            </span>
          ) : (
            <span className="text-emerald-400 font-semibold">Elite achieved</span>
          )}
        </div>
      </div>

      {/* Level thresholds quick ref */}
      <div className="mt-5 grid grid-cols-4 gap-2 border-t border-slate-700/60 pt-5">
        {(
          [
            { level: Level.BRONZE, threshold: 0 },
            { level: Level.SILVER, threshold: LEVEL_THRESHOLDS.SILVER },
            { level: Level.GOLD, threshold: LEVEL_THRESHOLDS.GOLD },
            { level: Level.ELITE, threshold: LEVEL_THRESHOLDS.ELITE },
          ] as const
        ).map(({ level: lv, threshold }) => (
          <div key={lv} className="text-center">
            <p
              className={cn(
                'text-xs font-bold uppercase tracking-wider',
                getLevelColor(lv),
              )}
            >
              {getLevelLabel(lv)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{threshold.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-700 bg-slate-800/40 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-700 text-2xl">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-200">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{body}</p>
      </div>
    </div>
  )
}

type LedgerRow = {
  id: string
  sourceType: PointsSourceType
  points: number
  reason: string
  createdAt: Date
}

function PointsHistoryTable({ rows }: { rows: LedgerRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="h-6 w-6 text-yellow-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        }
        title="No points history yet"
        body="Start logging activities, completing challenges, and attending events to earn points."
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
      {/* Mobile card list */}
      <ul className="divide-y divide-slate-700/60 sm:hidden">
        {rows.map((row) => (
          <li key={row.id} className="flex items-start gap-3 px-4 py-4">
            <div
              className={cn(
                'mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ring-1',
                sourceTypePill(row.sourceType),
              )}
            >
              {sourceTypeLabel(row.sourceType)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-200">{row.reason}</p>
              <p className="mt-0.5 text-xs text-slate-500">{formatDate(row.createdAt)}</p>
            </div>
            <span
              className={cn(
                'shrink-0 text-sm font-bold tabular-nums',
                row.points >= 0 ? 'text-green-400' : 'text-red-400',
              )}
            >
              {row.points >= 0 ? '+' : ''}
              {row.points.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>

      {/* Desktop table */}
      <table className="hidden w-full text-sm sm:table">
        <thead>
          <tr className="border-b border-slate-700/60 bg-slate-800/80">
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Date
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Source
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Reason
            </th>
            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
              Points
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/40">
          {rows.map((row) => (
            <tr
              key={row.id}
              className="group transition-colors hover:bg-slate-700/30"
            >
              <td className="whitespace-nowrap px-5 py-3.5 text-slate-400">
                {formatDate(row.createdAt)}
              </td>
              <td className="px-5 py-3.5">
                <span
                  className={cn(
                    'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1',
                    sourceTypePill(row.sourceType),
                  )}
                >
                  {sourceTypeLabel(row.sourceType)}
                </span>
              </td>
              <td className="max-w-xs px-5 py-3.5 text-slate-300">
                <span className="block truncate">{row.reason}</span>
              </td>
              <td
                className={cn(
                  'whitespace-nowrap px-5 py-3.5 text-right text-sm font-bold tabular-nums',
                  row.points >= 0 ? 'text-green-400' : 'text-red-400',
                )}
              >
                {row.points >= 0 ? '+' : ''}
                {row.points.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type RedemptionRow = {
  id: string
  redemptionCode: string
  pointsSpent: number
  status: RedemptionStatus
  createdAt: Date
  usedAt: Date | null
  reward: {
    title: string
    category: string
    imageUrl: string | null
  }
}

function RedemptionsTable({ rows }: { rows: RedemptionRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
        }
        title="No redemptions yet"
        body="Head to the Rewards section to spend your points on exciting rewards."
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
      {/* Mobile card list */}
      <ul className="divide-y divide-slate-700/60 sm:hidden">
        {rows.map((row) => (
          <li key={row.id} className="px-4 py-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-slate-200 leading-snug">{row.reward.title}</p>
              <span
                className={cn(
                  'shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ring-1',
                  redemptionStatusStyle(row.status),
                )}
              >
                {redemptionStatusLabel(row.status)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>{formatDate(row.createdAt)}</span>
              <span className="font-semibold text-red-400">-{row.pointsSpent.toLocaleString()} pts</span>
            </div>
            <p className="font-mono text-xs text-slate-400 select-all break-all">
              {row.redemptionCode}
            </p>
          </li>
        ))}
      </ul>

      {/* Desktop table */}
      <table className="hidden w-full text-sm sm:table">
        <thead>
          <tr className="border-b border-slate-700/60 bg-slate-800/80">
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Reward
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Date
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Redemption Code
            </th>
            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cost
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/40">
          {rows.map((row) => (
            <tr key={row.id} className="group transition-colors hover:bg-slate-700/30">
              <td className="max-w-50 px-5 py-3.5">
                <p className="truncate font-medium text-slate-200">{row.reward.title}</p>
              </td>
              <td className="whitespace-nowrap px-5 py-3.5 text-slate-400">
                {formatDate(row.createdAt)}
              </td>
              <td className="px-5 py-3.5">
                <code className="select-all rounded bg-slate-700/60 px-2 py-0.5 font-mono text-xs text-slate-300">
                  {row.redemptionCode}
                </code>
              </td>
              <td className="whitespace-nowrap px-5 py-3.5 text-right font-bold tabular-nums text-red-400">
                -{row.pointsSpent.toLocaleString()}
              </td>
              <td className="px-5 py-3.5">
                <span
                  className={cn(
                    'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1',
                    redemptionStatusStyle(row.status),
                  )}
                >
                  {redemptionStatusLabel(row.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function WalletPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { profile, ledger, redemptions } = await getWalletData(user.id)

  const totalPoints = profile?.totalPoints ?? 0
  const lifetimePoints = profile?.lifetimePoints ?? 0
  const level = profile?.level ?? Level.BRONZE

  // Quick summary stats derived from ledger
  const earnedRows = ledger.filter((r) => r.points > 0)
  const spentRows = ledger.filter((r) => r.points < 0)
  const totalEarned = earnedRows.reduce((s, r) => s + r.points, 0)
  const totalSpent = Math.abs(spentRows.reduce((s, r) => s + r.points, 0))

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">

        {/* ── Page header ── */}
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">My Wallet</h1>
          <p className="mt-1 text-sm text-slate-400">
            Track your points balance, earning history, and reward redemptions.
          </p>
        </div>

        {/* ── Balance + level card ── */}
        <section aria-label="Points balance and level">
          <BalanceCard
            totalPoints={totalPoints}
            lifetimePoints={lifetimePoints}
            level={level}
          />
        </section>

        {/* ── Quick summary strip ── */}
        <section
          aria-label="Points summary"
          className="grid grid-cols-3 gap-3"
        >
          {[
            {
              label: 'Total Earned',
              value: `+${totalEarned.toLocaleString()}`,
              color: 'text-green-400',
              bg: 'bg-green-600/10 ring-green-600/20',
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              ),
            },
            {
              label: 'Total Spent',
              value: `-${totalSpent.toLocaleString()}`,
              color: 'text-red-400',
              bg: 'bg-red-600/10 ring-red-600/20',
              icon: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              ),
            },
            {
              label: 'Redemptions',
              value: redemptions.length.toString(),
              color: 'text-yellow-400',
              bg: 'bg-yellow-600/10 ring-yellow-600/20',
              icon: (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 p-4 ring-1 text-center sm:flex-row sm:items-center sm:gap-3 sm:text-left',
                stat.bg,
              )}
            >
              <div className={cn('hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', stat.color)}>
                {stat.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400 truncate">{stat.label}</p>
                <p className={cn('text-lg font-bold leading-tight tabular-nums', stat.color)}>
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* ── Points history ── */}
        <section aria-labelledby="points-history-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2
              id="points-history-heading"
              className="text-lg font-semibold text-white"
            >
              Points History
            </h2>
            <span className="text-sm text-slate-500">
              {ledger.length.toLocaleString()} {ledger.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>
          <PointsHistoryTable rows={ledger} />
        </section>

        {/* ── Redemptions ── */}
        <section aria-labelledby="redemptions-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2
              id="redemptions-heading"
              className="text-lg font-semibold text-white"
            >
              Reward Redemptions
            </h2>
            <span className="text-sm text-slate-500">
              {redemptions.length.toLocaleString()} {redemptions.length === 1 ? 'redemption' : 'redemptions'}
            </span>
          </div>
          <RedemptionsTable rows={redemptions} />
        </section>

      </div>
    </div>
  )
}
