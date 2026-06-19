import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getDashboardStats, getEngagementByCenter } from '@/services/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Role, PointsSourceType, RewardCategory, ActivityType } from '@/generated/prisma'
import { activityTypeLabel, rewardCategoryLabel } from '@/lib/utils'
import { FileBarChart, Building2, Zap, Trophy, Gift, Activity } from 'lucide-react'

// ─── Label helpers ─────────────────────────────────────────────────────────────

function pointsSourceLabel(source: PointsSourceType): string {
  switch (source) {
    case PointsSourceType.ACTIVITY:
      return 'Activity'
    case PointsSourceType.CHALLENGE_COMPLETION:
      return 'Challenge Completion'
    case PointsSourceType.EVENT_ATTENDANCE:
      return 'Event Attendance'
    case PointsSourceType.BADGE_AWARD:
      return 'Badge Award'
    case PointsSourceType.ADMIN_BONUS:
      return 'Admin Bonus'
    case PointsSourceType.REDEMPTION_DEBIT:
      return 'Redemption Debit'
    case PointsSourceType.REFERRAL:
      return 'Referral'
    case PointsSourceType.CUSTOM:
      return 'Custom'
    default:
      return source
  }
}

// ─── Table primitives ──────────────────────────────────────────────────────────

function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
      {children}
    </th>
  )
}

function TableCell({ children, numeric }: { children: React.ReactNode; numeric?: boolean }) {
  return (
    <td className={`px-4 py-3 text-sm text-slate-200 ${numeric ? 'tabular-nums text-right' : ''}`}>
      {children}
    </td>
  )
}

function EmptyRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-8 text-center text-sm text-slate-500">
        No data available.
      </td>
    </tr>
  )
}

// ─── Section wrapper ───────────────────────────────────────────────────────────

function ReportSection({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-white text-base">
          <Icon className="h-4 w-4 text-green-400 shrink-0" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {children}
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminReportsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== Role.PLATFORM_ADMIN && user.role !== Role.CENTER_ADMIN) redirect('/app')

  const [
    stats,
    centerEngagement,
    pointsBySource,
    topPlayers,
    redemptionsByCategory,
    activitiesByType,
  ] = await Promise.all([
    getDashboardStats(),
    getEngagementByCenter(),

    // Points grouped by source type (positive entries only)
    prisma.pointsLedger.groupBy({
      by: ['sourceType'],
      where: { points: { gt: 0 } },
      _sum: { points: true },
      _count: { _all: true },
      orderBy: { _sum: { points: 'desc' } },
    }),

    // Top 10 players by lifetime points
    prisma.playerProfile.findMany({
      orderBy: { lifetimePoints: 'desc' },
      take: 10,
      select: {
        lifetimePoints: true,
        totalPoints: true,
        level: true,
        totalActivities: true,
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            email: true,
          },
        },
      },
    }),

    // Reward redemptions grouped by reward category
    prisma.rewardRedemption.groupBy({
      by: ['rewardId'],
      _count: { _all: true },
    }).then(async (groups) => {
      // We need to join with reward to get category — fetch rewards referenced
      const rewardIds = groups.map((g) => g.rewardId)
      const rewards = await prisma.reward.findMany({
        where: { id: { in: rewardIds } },
        select: { id: true, category: true },
      })
      const categoryMap = new Map(rewards.map((r) => [r.id, r.category]))

      // Aggregate counts by category
      const byCategory = new Map<RewardCategory, number>()
      for (const g of groups) {
        const cat = categoryMap.get(g.rewardId)
        if (cat) {
          byCategory.set(cat, (byCategory.get(cat) ?? 0) + g._count._all)
        }
      }
      return Array.from(byCategory.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
    }),

    // Activities grouped by type
    prisma.activity.groupBy({
      by: ['type'],
      _count: { _all: true },
      orderBy: { _count: { type: 'desc' } },
    }),
  ])

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <FileBarChart className="h-6 w-6 text-green-400 shrink-0" />
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics &amp; Reports</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Platform-wide engagement, points, and activity breakdowns
          </p>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Players', value: stats.totalPlayers.toLocaleString() },
          { label: 'Total Activities', value: stats.totalActivities.toLocaleString() },
          { label: 'Points Issued', value: stats.totalPointsIssued.toLocaleString() },
          { label: 'Rewards Redeemed', value: stats.rewardsRedeemed.toLocaleString() },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg bg-slate-800 border border-slate-700 px-4 py-3"
          >
            <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-xl font-bold text-white tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Engagement by Center ─────────────────────────────────────────────── */}
      <ReportSection title="Engagement by Center" icon={Building2}>
        <thead>
          <tr className="border-b border-slate-700">
            <TableHeader>#</TableHeader>
            <TableHeader>Center</TableHeader>
            <TableHeader>City</TableHeader>
            <TableHeader>Players</TableHeader>
            <TableHeader>Activities</TableHeader>
            <TableHeader>Total Points</TableHeader>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {centerEngagement.length === 0 ? (
            <EmptyRow cols={6} />
          ) : (
            centerEngagement.map((row, idx) => (
              <tr key={row.center.id} className="hover:bg-slate-700/30 transition-colors">
                <TableCell>
                  <span className="text-slate-500">{idx + 1}</span>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-white">{row.center.name}</span>
                </TableCell>
                <TableCell>
                  <span className="text-slate-400">{row.center.city ?? '—'}</span>
                </TableCell>
                <TableCell numeric>{row.playerCount.toLocaleString()}</TableCell>
                <TableCell numeric>{row.activityCount.toLocaleString()}</TableCell>
                <TableCell numeric>
                  <span className="text-green-400 font-medium">
                    {row.totalPoints.toLocaleString()}
                  </span>
                </TableCell>
              </tr>
            ))
          )}
        </tbody>
      </ReportSection>

      {/* ── Points by Source ─────────────────────────────────────────────────── */}
      <ReportSection title="Points by Source" icon={Zap}>
        <thead>
          <tr className="border-b border-slate-700">
            <TableHeader>Source Type</TableHeader>
            <TableHeader>Transactions</TableHeader>
            <TableHeader>Total Points</TableHeader>
            <TableHeader>Avg per Transaction</TableHeader>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {pointsBySource.length === 0 ? (
            <EmptyRow cols={4} />
          ) : (
            pointsBySource.map((row) => {
              const total = row._sum.points ?? 0
              const count = row._count._all
              const avg = count > 0 ? Math.round(total / count) : 0
              return (
                <tr
                  key={row.sourceType}
                  className="hover:bg-slate-700/30 transition-colors"
                >
                  <TableCell>
                    <span className="font-medium text-white">
                      {pointsSourceLabel(row.sourceType)}
                    </span>
                  </TableCell>
                  <TableCell numeric>{count.toLocaleString()}</TableCell>
                  <TableCell numeric>
                    <span className="text-green-400 font-medium">
                      {total.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell numeric>
                    <span className="text-slate-300">{avg.toLocaleString()}</span>
                  </TableCell>
                </tr>
              )
            })
          )}
        </tbody>
      </ReportSection>

      {/* ── Top Players ──────────────────────────────────────────────────────── */}
      <ReportSection title="Top 10 Players (Lifetime Points)" icon={Trophy}>
        <thead>
          <tr className="border-b border-slate-700">
            <TableHeader>Rank</TableHeader>
            <TableHeader>Player</TableHeader>
            <TableHeader>Level</TableHeader>
            <TableHeader>Activities</TableHeader>
            <TableHeader>Current Points</TableHeader>
            <TableHeader>Lifetime Points</TableHeader>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {topPlayers.length === 0 ? (
            <EmptyRow cols={6} />
          ) : (
            topPlayers.map((p, idx) => {
              const rankColors: Record<number, string> = {
                0: 'text-yellow-400 font-bold',
                1: 'text-slate-300 font-bold',
                2: 'text-amber-600 font-bold',
              }
              const levelColors: Record<string, string> = {
                BRONZE: 'text-amber-700',
                SILVER: 'text-slate-400',
                GOLD: 'text-yellow-500',
                ELITE: 'text-emerald-400',
              }
              return (
                <tr key={p.user.id} className="hover:bg-slate-700/30 transition-colors">
                  <TableCell>
                    <span className={rankColors[idx] ?? 'text-slate-500'}>
                      #{idx + 1}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-white">
                        {p.user.nickname ?? p.user.name ?? '—'}
                      </p>
                      <p className="text-xs text-slate-500">{p.user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-semibold uppercase tracking-wide ${levelColors[p.level] ?? 'text-slate-400'}`}>
                      {p.level}
                    </span>
                  </TableCell>
                  <TableCell numeric>{p.totalActivities.toLocaleString()}</TableCell>
                  <TableCell numeric>
                    <span className="text-slate-300">
                      {p.totalPoints.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell numeric>
                    <span className="text-green-400 font-medium">
                      {p.lifetimePoints.toLocaleString()}
                    </span>
                  </TableCell>
                </tr>
              )
            })
          )}
        </tbody>
      </ReportSection>

      {/* ── Rewards Redeemed ─────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ReportSection title="Rewards Redeemed by Category" icon={Gift}>
          <thead>
            <tr className="border-b border-slate-700">
              <TableHeader>Category</TableHeader>
              <TableHeader>Count</TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {redemptionsByCategory.length === 0 ? (
              <EmptyRow cols={2} />
            ) : (
              redemptionsByCategory.map((row) => (
                <tr
                  key={row.category}
                  className="hover:bg-slate-700/30 transition-colors"
                >
                  <TableCell>
                    <span className="font-medium text-white">
                      {rewardCategoryLabel(row.category)}
                    </span>
                  </TableCell>
                  <TableCell numeric>
                    <span className="text-green-400 font-medium">
                      {row.count.toLocaleString()}
                    </span>
                  </TableCell>
                </tr>
              ))
            )}
          </tbody>
        </ReportSection>

        {/* ── Activities by Type ───────────────────────────────────────────────── */}
        <ReportSection title="Activities by Type" icon={Activity}>
          <thead>
            <tr className="border-b border-slate-700">
              <TableHeader>Activity Type</TableHeader>
              <TableHeader>Count</TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {activitiesByType.length === 0 ? (
              <EmptyRow cols={2} />
            ) : (
              activitiesByType.map((row) => (
                <tr
                  key={row.type}
                  className="hover:bg-slate-700/30 transition-colors"
                >
                  <TableCell>
                    <span className="font-medium text-white">
                      {activityTypeLabel(row.type)}
                    </span>
                  </TableCell>
                  <TableCell numeric>
                    <span className="text-green-400 font-medium">
                      {row._count._all.toLocaleString()}
                    </span>
                  </TableCell>
                </tr>
              ))
            )}
          </tbody>
        </ReportSection>
      </div>
    </div>
  )
}
