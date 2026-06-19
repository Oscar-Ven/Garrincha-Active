import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LeaderboardRow } from '@/components/player/leaderboard-row'
import { BarChart3, Shield } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Leaderboards' }

async function getGlobalLeaderboard(metric: 'points' | 'distance' | 'minutes', limit = 50) {
  const sortField = metric === 'points' ? 'totalPoints' : metric === 'distance' ? 'totalDistance' : 'totalMinutes'
  const profiles = await prisma.playerProfile.findMany({
    orderBy: { [sortField]: 'desc' },
    take: limit,
    include: {
      user: {
        select: { id: true, name: true, nickname: true, avatarUrl: true, center: { select: { id: true, name: true } } },
      },
    },
  })
  return profiles.map((p, i) => ({
    rank: i + 1,
    userId: p.user.id,
    name: p.user.name,
    nickname: p.user.nickname,
    avatarUrl: p.user.avatarUrl,
    centerId: p.user.center?.id ?? null,
    centerName: p.user.center?.name ?? null,
    points: p.totalPoints,
    distance: p.totalDistance,
    minutes: p.totalMinutes,
  }))
}

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; metric?: string }>
}) {
  const session = await getCurrentUser()
  if (!session) redirect('/login')

  const { filter = 'global', metric = 'points' } = await searchParams
  const safeMetric = (metric === 'distance' || metric === 'minutes') ? metric : 'points'

  const entries = await getGlobalLeaderboard(safeMetric, 50)
  const userRank = entries.findIndex((e) => e.userId === session.id) + 1

  const filterTabs = ['global', 'weekly', 'monthly']
  const metricTabs = ['points', 'distance', 'minutes']

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-yellow-400" /> Leaderboards
      </h1>

      {/* Center League shortcut */}
      <Link
        href="/app/leaderboards/centers"
        className="flex items-center justify-between rounded-xl border border-purple-700/40 bg-purple-900/20 px-5 py-3 hover:bg-purple-900/40 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-purple-400" />
          <div>
            <p className="text-sm font-semibold text-white">Center League Table</p>
            <p className="text-xs text-slate-400">Football-style ranking of all training centers</p>
          </div>
        </div>
        <span className="text-slate-400 group-hover:text-white transition-colors text-sm">View →</span>
      </Link>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 rounded-lg bg-slate-800 p-1">
          {filterTabs.map((f) => (
            <Link
              key={f}
              href={`?filter=${f}&metric=${safeMetric}`}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                filter === f ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {f}
            </Link>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-800 p-1">
          {metricTabs.map((m) => (
            <Link
              key={m}
              href={`?filter=${filter}&metric=${m}`}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                safeMetric === m ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {m}
            </Link>
          ))}
        </div>
      </div>

      {/* User rank highlight */}
      {userRank > 0 && (
        <div className="rounded-lg bg-green-900/30 border border-green-700/50 px-4 py-2 text-sm text-green-300">
          Your rank: <span className="font-bold">#{userRank}</span> globally by {safeMetric}
        </div>
      )}

      {/* Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-base capitalize">{filter} · By {safeMetric}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-700">
            {entries.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No players yet.</p>
            ) : (
              entries.map((entry) => (
                <LeaderboardRow
                  key={entry.userId}
                  entry={entry}
                  rank={entry.rank}
                  isCurrentUser={entry.userId === session.id}
                  metric={safeMetric}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
