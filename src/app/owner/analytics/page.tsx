import { requireOwner } from '@/lib/owner-auth'
import { prisma } from '@/lib/db'
import { BarChart3, TrendingUp, Activity, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Analytics | Owner Console' }

export default async function OwnerAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  await requireOwner()
  const { range = '30' } = await searchParams
  const days = range === '7' ? 7 : range === '90' ? 90 : 30

  const since = new Date(Date.now() - days * 86400000)

  // Daily activity counts
  const dailyActivities = await Promise.all(
    Array.from({ length: days }, (_, i) => {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - (days - 1 - i))
      const next = new Date(d)
      next.setDate(next.getDate() + 1)
      return prisma.activity.count({ where: { createdAt: { gte: d, lt: next } } }).then((count) => ({
        date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        count,
      }))
    }),
  )

  // Daily signups
  const dailySignups = await Promise.all(
    Array.from({ length: days }, (_, i) => {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - (days - 1 - i))
      const next = new Date(d)
      next.setDate(next.getDate() + 1)
      return prisma.user.count({ where: { createdAt: { gte: d, lt: next } } }).then((count) => ({
        date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        count,
      }))
    }),
  )

  // Activity type breakdown
  const activityTypes = await prisma.activity.groupBy({
    by: ['type'],
    _count: { id: true },
    where: { createdAt: { gte: since } },
    orderBy: { _count: { id: 'desc' } },
  })

  const totalTypeCount = activityTypes.reduce((s, t) => s + t._count.id, 0)

  // Top players by points
  const topPlayers = await prisma.playerProfile.findMany({
    orderBy: { totalPoints: 'desc' },
    take: 10,
    include: { user: { select: { name: true, nickname: true, center: { select: { name: true } } } } },
  })

  // Top players by distance
  const topDistance = await prisma.playerProfile.findMany({
    orderBy: { totalDistance: 'desc' },
    take: 10,
    include: { user: { select: { name: true } } },
  })

  // Center engagement (most active by activities in range)
  const centerStats = await prisma.center.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { players: true } },
      players: {
        select: {
          _count: { select: { activities: true } },
        },
      },
    },
    take: 8,
  })

  const centersWithActivity = centerStats
    .map((c) => ({
      name: c.name,
      members: c._count.players,
      totalActivities: c.players.reduce((s, p) => s + p._count.activities, 0),
    }))
    .sort((a, b) => b.totalActivities - a.totalActivities)

  const actMax = Math.max(...dailyActivities.map((d) => d.count), 1)
  const sigMax = Math.max(...dailySignups.map((d) => d.count), 1)

  // Subsample for chart display (show at most 30 bars)
  const step = Math.max(1, Math.floor(days / 30))
  const chartActivities = dailyActivities.filter((_, i) => i % step === 0 || i === dailyActivities.length - 1)
  const chartSignups = dailySignups.filter((_, i) => i % step === 0 || i === dailySignups.length - 1)

  const TYPE_EMOJI: Record<string, string> = {
    RUN: '🏃', WALK: '🚶', CYCLING: '🚴', FOOTBALL_TRAINING: '⚽',
    FOOTBALL_MATCH: '🏟️', FITNESS: '💪', CUSTOM: '🎯',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-cyan-400" />
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-800 p-1">
          {[['7', '7d'], ['30', '30d'], ['90', '90d']].map(([v, l]) => (
            <a
              key={v}
              href={`/owner/analytics?range=${v}`}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                range === v ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {l}
            </a>
          ))}
        </div>
      </div>

      {/* Summary row */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Activities', value: dailyActivities.reduce((s, d) => s + d.count, 0), color: 'text-green-400', icon: Activity },
          { label: 'New Users', value: dailySignups.reduce((s, d) => s + d.count, 0), color: 'text-blue-400', icon: Users },
          { label: 'Daily Avg Activities', value: (dailyActivities.reduce((s, d) => s + d.count, 0) / days).toFixed(1), color: 'text-amber-400', icon: TrendingUp },
          { label: 'Daily Avg Signups', value: (dailySignups.reduce((s, d) => s + d.count, 0) / days).toFixed(1), color: 'text-cyan-400', icon: TrendingUp },
        ].map((s) => (
          <Card key={s.label} className="bg-slate-900 border-slate-800">
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-600">last {days} days</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity chart */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-base">Activities per Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-32 overflow-x-auto">
            {chartActivities.map((d) => (
              <div key={d.date} className="flex flex-col items-center gap-0.5 min-w-[20px] flex-1">
                <div
                  className="w-full rounded-t bg-green-500/70 min-h-[2px]"
                  style={{ height: `${Math.max(2, (d.count / actMax) * 100)}px` }}
                  title={`${d.date}: ${d.count}`}
                />
                {chartActivities.length <= 14 && (
                  <span className="text-xs text-slate-600 rotate-0">{d.date}</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Signups chart */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-base">New Signups per Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-24 overflow-x-auto">
            {chartSignups.map((d) => (
              <div key={d.date} className="flex flex-col items-center gap-0.5 min-w-[20px] flex-1">
                <div
                  className="w-full rounded-t bg-blue-500/70 min-h-[2px]"
                  style={{ height: `${Math.max(2, (d.count / sigMax) * 80)}px` }}
                  title={`${d.date}: ${d.count}`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activity type breakdown */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Sport Type Breakdown (last {days}d)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activityTypes.map((t) => (
              <div key={t.type}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">{TYPE_EMOJI[t.type]} {t.type.replace(/_/g, ' ')}</span>
                  <span className="text-white font-medium">{t._count.id} ({totalTypeCount > 0 ? ((t._count.id / totalTypeCount) * 100).toFixed(0) : 0}%)</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-amber-500/70"
                    style={{ width: `${totalTypeCount > 0 ? (t._count.id / totalTypeCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
            {activityTypes.length === 0 && <p className="text-slate-500 text-sm">No activities in this period</p>}
          </CardContent>
        </Card>

        {/* Center engagement */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Center Engagement (all time)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {centersWithActivity.map((c, i) => (
              <div key={c.name} className="flex items-center gap-3 rounded-lg bg-slate-800/40 px-3 py-2">
                <span className="text-xs font-bold text-slate-500 w-4">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.members} members</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-amber-400">{c.totalActivities}</p>
                  <p className="text-xs text-slate-500">activities</p>
                </div>
              </div>
            ))}
            {centersWithActivity.length === 0 && <p className="text-slate-500 text-sm">No centers yet</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top players by points */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Top Players — Points</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topPlayers.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg bg-slate-800/40 px-3 py-2">
                <span className={`text-xs font-bold w-5 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{p.user.name}</p>
                  <p className="text-xs text-slate-500">{p.user.center?.name ?? 'No center'}</p>
                </div>
                <p className="text-sm font-bold text-amber-400">{p.totalPoints.toLocaleString()} pts</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top players by distance */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Top Players — Distance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topDistance.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg bg-slate-800/40 px-3 py-2">
                <span className={`text-xs font-bold w-5 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <p className="flex-1 text-sm font-medium text-white truncate">{p.user.name}</p>
                <p className="text-sm font-bold text-blue-400">{p.totalDistance.toFixed(1)} km</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
