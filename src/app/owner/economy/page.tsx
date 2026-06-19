import { requireOwner } from '@/lib/owner-auth'
import { prisma } from '@/lib/db'
import { Coins, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Points Economy | Owner Console' }

export default async function OwnerEconomyPage() {
  await requireOwner()

  const [
    totalEarned,
    totalSpent,
    earnedBySource,
    spentBySource,
    recentTransactions,
    topEarners,
  ] = await Promise.all([
    prisma.pointsLedger.aggregate({
      _sum: { points: true },
      where: { points: { gt: 0 } },
    }),
    prisma.pointsLedger.aggregate({
      _sum: { points: true },
      where: { points: { lt: 0 } },
    }),
    prisma.pointsLedger.groupBy({
      by: ['sourceType'],
      _sum: { points: true },
      _count: { _all: true },
      where: { points: { gt: 0 } },
      orderBy: { _sum: { points: 'desc' } },
    }),
    prisma.pointsLedger.groupBy({
      by: ['sourceType'],
      _sum: { points: true },
      _count: { _all: true },
      where: { points: { lt: 0 } },
      orderBy: { _sum: { points: 'asc' } },
    }),
    prisma.pointsLedger.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { name: true, nickname: true } } },
    }),
    prisma.playerProfile.findMany({
      orderBy: { lifetimePoints: 'desc' },
      take: 10,
      include: { user: { select: { name: true } } },
    }),
  ])

  const totalEarnedVal = totalEarned._sum.points ?? 0
  const totalSpentVal = Math.abs(totalSpent._sum.points ?? 0)
  const inCirculation = totalEarnedVal - totalSpentVal
  const burnRate = totalEarnedVal > 0 ? ((totalSpentVal / totalEarnedVal) * 100).toFixed(1) : '0'

  const SOURCE_LABELS: Record<string, string> = {
    ACTIVITY: 'Activity Completion',
    CHALLENGE_COMPLETION: 'Challenge Win',
    EVENT_ATTENDANCE: 'Event Attendance',
    BADGE_AWARD: 'Badge Earned',
    ADMIN_BONUS: 'Admin Bonus',
    REDEMPTION_DEBIT: 'Reward Redemption',
    REFERRAL: 'Referral',
    CUSTOM: 'Custom',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Coins className="h-6 w-6 text-amber-400" />
        <h1 className="text-2xl font-bold text-white">Points Economy</h1>
      </div>

      {/* Summary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Earned (all time)', value: totalEarnedVal.toLocaleString(), icon: TrendingUp, color: 'text-green-400' },
          { label: 'Total Spent (all time)', value: totalSpentVal.toLocaleString(), icon: TrendingDown, color: 'text-red-400' },
          { label: 'In Circulation', value: inCirculation.toLocaleString(), icon: Coins, color: 'text-amber-400' },
          { label: 'Burn Rate', value: `${burnRate}%`, icon: Activity, color: inCirculation < 0 ? 'text-red-400' : 'text-cyan-400' },
        ].map((k) => (
          <Card key={k.label} className="bg-slate-900 border-slate-800">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">{k.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
                </div>
                <k.icon className={`h-5 w-5 ${k.color} opacity-60`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Economy health bar */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-base">Economy Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-green-400">Earned: {totalEarnedVal.toLocaleString()} pts</span>
              <span className="text-red-400">Spent: {totalSpentVal.toLocaleString()} pts</span>
            </div>
            <div className="h-4 rounded-full bg-slate-800 overflow-hidden flex">
              <div
                className="h-full bg-green-500/80 transition-all"
                style={{ width: `${totalEarnedVal > 0 ? Math.min(100, (totalSpentVal / totalEarnedVal) * 100) : 0}%` }}
              />
              <div className="h-full bg-amber-500/80 flex-1" />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Spent ({burnRate}%)</span>
              <span>In circulation</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Earnings by source */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-400" /> Points Earned — By Source
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {earnedBySource.map((s) => {
              const val = s._sum.points ?? 0
              const pct = totalEarnedVal > 0 ? (val / totalEarnedVal) * 100 : 0
              return (
                <div key={s.sourceType}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">{SOURCE_LABELS[s.sourceType] ?? s.sourceType}</span>
                    <span className="text-white font-medium">{val.toLocaleString()} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-green-500/70" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{s._count._all} transactions</p>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Spending by source */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-400" /> Points Spent — By Source
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {spentBySource.map((s) => {
              const val = Math.abs(s._sum.points ?? 0)
              const pct = totalSpentVal > 0 ? (val / totalSpentVal) * 100 : 0
              return (
                <div key={s.sourceType}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">{SOURCE_LABELS[s.sourceType] ?? s.sourceType}</span>
                    <span className="text-white font-medium">{val.toLocaleString()} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-red-500/70" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{s._count._all} transactions</p>
                </div>
              )
            })}
            {spentBySource.length === 0 && <p className="text-slate-500 text-sm">No spending recorded yet</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top lifetime earners */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Top Lifetime Earners</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topEarners.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg bg-slate-800/40 px-3 py-2">
                <span className={`text-xs font-bold w-5 ${i < 3 ? 'text-yellow-400' : 'text-slate-500'}`}>#{i + 1}</span>
                <p className="flex-1 text-sm text-white truncate">{p.user.name}</p>
                <div className="text-right">
                  <p className="text-sm font-bold text-amber-400">{p.lifetimePoints.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">lifetime pts</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent transactions */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {recentTransactions.map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-lg bg-slate-800/30 px-3 py-2">
                <span className={`text-sm font-bold w-14 tabular-nums ${t.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {t.points > 0 ? '+' : ''}{t.points}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{t.user.name}</p>
                  <p className="text-xs text-slate-500">{SOURCE_LABELS[t.sourceType] ?? t.sourceType}</p>
                </div>
                <p className="text-xs text-slate-600 shrink-0">
                  {new Date(t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
