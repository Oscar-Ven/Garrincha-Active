import { requireOwner } from '@/lib/owner-auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import {
  Users, Activity, Coins, Building2, Trophy, Flag,
  TrendingUp, AlertTriangle, Gift, ScrollText, Server,
  Crown, Eye, BarChart3,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Owner Console | Garrincha Active' }

export default async function OwnerDashboardPage() {
  await requireOwner()

  // Run all counts in parallel
  const [
    totalUsers,
    totalPlayers,
    totalAdmins,
    totalActivities,
    activitiesToday,
    activitiesThisWeek,
    totalActivitiesApproved,
    totalActivitiesFlagged,
    totalActivitiesPending,
    totalCenters,
    totalTeams,
    totalChallenges,
    totalDirectChallenges,
    totalPoints,
    totalRedemptions,
    totalAuctions,
    totalActiveAuctions,
    totalBadgesAwarded,
    totalFollows,
    totalNotifications,
    flaggedActivities,
    recentReports,
    recentAuditLogs,
    recentSignups,
    recentActivities,
    topCenters,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'PLAYER' } }),
    prisma.user.count({ where: { role: { in: ['PLATFORM_ADMIN', 'CENTER_ADMIN'] } } }),
    prisma.activity.count(),
    prisma.activity.count({ where: { createdAt: { gte: new Date(Date.now() - 86400000) } } }),
    prisma.activity.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
    prisma.activity.count({ where: { status: 'APPROVED' } }),
    prisma.activity.count({ where: { status: 'FLAGGED' } }),
    prisma.activity.count({ where: { status: 'PENDING' } }),
    prisma.center.count(),
    prisma.team.count(),
    prisma.challenge.count(),
    prisma.directChallenge.count(),
    prisma.pointsLedger.aggregate({ _sum: { points: true } }),
    prisma.rewardRedemption.count(),
    prisma.rewardAuction.count(),
    prisma.rewardAuction.count({ where: { isSettled: false, endTime: { gte: new Date() } } }),
    prisma.userBadge.count(),
    prisma.follow.count(),
    prisma.notification.count(),
    prisma.activity.count({ where: { status: 'FLAGGED' } }),
    prisma.report.count({ where: { resolved: false } }),
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { admin: { select: { name: true, email: true } } },
    }),
    prisma.user.findMany({
      where: { role: 'PLAYER' },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, name: true, email: true, createdAt: true, center: { select: { name: true } } },
    }),
    prisma.activity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { name: true } } },
    }),
    prisma.center.findMany({
      where: { isActive: true },
      include: { _count: { select: { players: true, events: true } } },
      orderBy: { name: 'asc' },
      take: 5,
    }),
  ])

  const pointsInCirculation = totalPoints._sum.points ?? 0

  // 7-day activity chart data
  const last7Days = await Promise.all(
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - (6 - i))
      const next = new Date(d)
      next.setDate(next.getDate() + 1)
      return prisma.activity.count({ where: { createdAt: { gte: d, lt: next } } }).then((count) => ({
        label: d.toLocaleDateString('en-GB', { weekday: 'short' }),
        count,
      }))
    }),
  )

  const chartMax = Math.max(...last7Days.map((d) => d.count), 1)

  const statusColor = (s: string) =>
    s === 'APPROVED' ? 'text-green-400' : s === 'FLAGGED' ? 'text-red-400' : 'text-yellow-400'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Crown className="h-7 w-7 text-amber-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Owner Console</h1>
          <p className="text-slate-400 text-sm">Full platform visibility — all systems, all metrics</p>
        </div>
      </div>

      {/* Health strip */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Activities Flagged', value: flaggedActivities, color: flaggedActivities > 0 ? 'bg-red-900/40 border-red-700/50 text-red-300' : 'bg-green-900/20 border-green-700/30 text-green-300' },
          { label: 'Pending Reports', value: recentReports, color: recentReports > 0 ? 'bg-yellow-900/40 border-yellow-700/50 text-yellow-300' : 'bg-green-900/20 border-green-700/30 text-green-300' },
          { label: 'Active Auctions', value: totalActiveAuctions, color: 'bg-purple-900/20 border-purple-700/30 text-purple-300' },
          { label: 'Pending Activities', value: totalActivitiesPending, color: totalActivitiesPending > 0 ? 'bg-orange-900/20 border-orange-700/30 text-orange-300' : 'bg-green-900/20 border-green-700/30 text-green-300' },
        ].map((h) => (
          <div key={h.label} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${h.color}`}>
            {h.label}: {h.value}
          </div>
        ))}
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Users', value: totalUsers.toLocaleString(), sub: `${totalPlayers} players · ${totalAdmins} admins`, icon: Users, color: 'text-blue-400' },
          { label: 'Total Activities', value: totalActivities.toLocaleString(), sub: `${activitiesToday} today · ${activitiesThisWeek} this week`, icon: Activity, color: 'text-green-400' },
          { label: 'Points in Circulation', value: pointsInCirculation.toLocaleString(), sub: `${totalRedemptions} redemptions`, icon: Coins, color: 'text-amber-400' },
          { label: 'Centers', value: totalCenters.toLocaleString(), sub: `${totalTeams} teams`, icon: Building2, color: 'text-purple-400' },
          { label: 'Challenges', value: (totalChallenges + totalDirectChallenges).toLocaleString(), sub: `${totalChallenges} group · ${totalDirectChallenges} 1v1`, icon: Trophy, color: 'text-orange-400' },
          { label: 'Badges Awarded', value: totalBadgesAwarded.toLocaleString(), sub: 'all time', icon: Flag, color: 'text-yellow-400' },
          { label: 'Follows', value: totalFollows.toLocaleString(), sub: 'social connections', icon: TrendingUp, color: 'text-cyan-400' },
          { label: 'Notifications Sent', value: totalNotifications.toLocaleString(), sub: 'all time', icon: AlertTriangle, color: 'text-rose-400' },
        ].map((k) => (
          <Card key={k.label} className="bg-slate-900 border-slate-800">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">{k.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{k.sub}</p>
                </div>
                <k.icon className={`h-5 w-5 ${k.color} opacity-60`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 7-day activity chart */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-400" /> Activities — Last 7 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-28">
              {last7Days.map((d) => (
                <div key={d.label} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-xs text-slate-400 tabular-nums">{d.count}</span>
                  <div
                    className="w-full rounded-t bg-amber-500/70 min-h-1 transition-all"
                    style={{ height: `${Math.max(4, (d.count / chartMax) * 80)}px` }}
                  />
                  <span className="text-xs text-slate-500">{d.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity status breakdown */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Activity Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Approved', value: totalActivitiesApproved, total: totalActivities, color: 'bg-green-500' },
              { label: 'Flagged', value: totalActivitiesFlagged, total: totalActivities, color: 'bg-red-500' },
              { label: 'Pending', value: totalActivitiesPending, total: totalActivities, color: 'bg-yellow-500' },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">{s.label}</span>
                  <span className="text-white font-medium">{s.value.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full ${s.color}`}
                    style={{ width: `${totalActivities > 0 ? (s.value / totalActivities) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent signups */}
        <Card className="bg-slate-900 border-slate-800 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center justify-between">
              <span className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-400" /> Recent Signups</span>
              <Link href="/owner/users" className="text-xs text-amber-400 hover:text-amber-300">View all →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentSignups.map((u) => (
              <div key={u.id} className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-2">
                <div className="h-7 w-7 rounded-full bg-blue-900/50 flex items-center justify-center text-xs font-bold text-blue-300">
                  {u.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{u.name}</p>
                  <p className="text-xs text-slate-500 truncate">{u.center?.name ?? 'No center'}</p>
                </div>
                <p className="text-xs text-slate-600 shrink-0">
                  {new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            ))}
            {recentSignups.length === 0 && <p className="text-slate-500 text-xs text-center py-4">No signups yet</p>}
          </CardContent>
        </Card>

        {/* Top centers */}
        <Card className="bg-slate-900 border-slate-800 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center justify-between">
              <span className="flex items-center gap-2"><Building2 className="h-4 w-4 text-purple-400" /> Top Centers</span>
              <Link href="/owner/centers" className="text-xs text-amber-400 hover:text-amber-300">View all →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topCenters.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.city ?? '—'}</p>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-xs text-white font-semibold">{c._count.players}</p>
                  <p className="text-xs text-slate-500">members</p>
                </div>
              </div>
            ))}
            {topCenters.length === 0 && <p className="text-slate-500 text-xs text-center py-4">No centers yet</p>}
          </CardContent>
        </Card>

        {/* Recent audit log */}
        <Card className="bg-slate-900 border-slate-800 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center justify-between">
              <span className="flex items-center gap-2"><ScrollText className="h-4 w-4 text-slate-400" /> Recent Admin Actions</span>
              <Link href="/owner/audit" className="text-xs text-amber-400 hover:text-amber-300">Full log →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentAuditLogs.map((log) => (
              <div key={log.id} className="rounded-lg bg-slate-800/50 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-white truncate">{log.action.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-slate-600 shrink-0">
                    {new Date(log.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <p className="text-xs text-slate-500 truncate">{log.admin.name}</p>
              </div>
            ))}
            {recentAuditLogs.length === 0 && <p className="text-slate-500 text-xs text-center py-4">No admin actions yet</p>}
          </CardContent>
        </Card>
      </div>

      {/* Quick navigation */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Quick Access</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: '/owner/analytics', icon: BarChart3, label: 'Analytics', desc: 'Growth & engagement', color: 'text-cyan-400' },
            { href: '/owner/economy', icon: Coins, label: 'Points Economy', desc: 'Earned · spent · circulating', color: 'text-amber-400' },
            { href: '/owner/system', icon: Server, label: 'System Health', desc: 'DB · memory · uptime', color: 'text-green-400' },
            { href: '/owner/moderation', icon: Eye, label: 'Moderation', desc: `${flaggedActivities + recentReports} items need attention`, color: flaggedActivities + recentReports > 0 ? 'text-red-400' : 'text-slate-400' },
            { href: '/owner/users', icon: Users, label: 'Users', desc: `${totalUsers} total across all roles`, color: 'text-blue-400' },
            { href: '/owner/centers', icon: Building2, label: 'Centers', desc: `${totalCenters} active centers`, color: 'text-purple-400' },
            { href: '/owner/rewards', icon: Gift, label: 'Rewards', desc: `${totalRedemptions} redeemed · ${totalActiveAuctions} live auctions`, color: 'text-rose-400' },
            { href: '/owner/audit', icon: ScrollText, label: 'Audit Log', desc: 'All admin activity', color: 'text-slate-400' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 hover:border-amber-700/40 hover:bg-slate-800/80 transition-colors group"
            >
              <item.icon className={`h-5 w-5 ${item.color} shrink-0`} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-white group-hover:text-amber-300 transition-colors">{item.label}</p>
                <p className="text-xs text-slate-500 truncate">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
