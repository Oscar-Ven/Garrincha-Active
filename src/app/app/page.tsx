import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { ActivityCard } from '@/components/player/activity-card'
import { formatDistance, formatDuration, getLevelColor } from '@/lib/utils'
import { Activity, BarChart3, Trophy, Gift, Plus, Rss } from 'lucide-react'

export default async function AppDashboard() {
  const session = await getCurrentUser()
  if (!session) redirect('/login')

  // Load profile and recent data
  const profile = await prisma.playerProfile.findUnique({
    where: { userId: session.id },
    select: {
      totalPoints: true,
      lifetimePoints: true,
      level: true,
      totalDistance: true,
      totalMinutes: true,
      totalActivities: true,
    },
  })

  const recentActivities = await prisma.activity.findMany({
    where: { userId: session.id, status: 'APPROVED' },
    orderBy: { startedAt: 'desc' },
    take: 3,
    include: { user: { select: { name: true, nickname: true, avatarUrl: true } } },
  })

  const joinedChallenges = await prisma.challengeParticipant.findMany({
    where: { userId: session.id, isCompleted: false },
    include: {
      challenge: { select: { id: true, title: true, type: true, targetValue: true, endDate: true, pointsReward: true } },
    },
    take: 3,
  })

  const unreadNotifications = await prisma.notification.count({
    where: { userId: session.id, isRead: false },
  })

  const levelColors: Record<string, string> = {
    BRONZE: 'text-amber-600',
    SILVER: 'text-slate-400',
    GOLD: 'text-yellow-500',
    ELITE: 'text-purple-500',
  }

  const levelColor = levelColors[profile?.level ?? 'BRONZE'] ?? 'text-amber-600'

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, <span className="text-green-400">{session.nickname}</span>! 👋
          </h1>
          <p className="text-slate-400 mt-1">
            Level:{' '}
            <span className={`font-semibold ${levelColor}`}>
              {profile?.level ?? 'BRONZE'}
            </span>
            {' · '}
            <span className="text-slate-300">{profile?.totalPoints ?? 0} pts available</span>
          </p>
        </div>
        <Link
          href="/app/activities/new"
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Log Activity
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Points" value={profile?.totalPoints ?? 0} subtitle="Available to spend" icon={<BarChart3 className="h-5 w-5 text-green-400" />} />
        <StatCard title="Activities" value={profile?.totalActivities ?? 0} subtitle="Total logged" icon={<Activity className="h-5 w-5 text-blue-400" />} />
        <StatCard title="Distance" value={`${(profile?.totalDistance ?? 0).toFixed(1)} km`} subtitle="All time" icon={<Rss className="h-5 w-5 text-purple-400" />} />
        <StatCard title="Active Time" value={`${Math.round((profile?.totalMinutes ?? 0) / 60)}h`} subtitle={`${profile?.totalMinutes ?? 0} minutes`} icon={<Trophy className="h-5 w-5 text-yellow-400" />} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white text-base">Recent Activities</CardTitle>
            <Link href="/app/activities" className="text-xs text-green-400 hover:text-green-300">View all →</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivities.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No activities yet.</p>
                <Link href="/app/activities/new" className="text-green-400 text-sm hover:underline mt-1 inline-block">Log your first activity →</Link>
              </div>
            ) : (
              recentActivities.map((a) => (
                <ActivityCard key={a.id} activity={a} compact />
              ))
            )}
          </CardContent>
        </Card>

        {/* Active Challenges */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white text-base">My Challenges</CardTitle>
            <Link href="/app/challenges" className="text-xs text-green-400 hover:text-green-300">View all →</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {joinedChallenges.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active challenges.</p>
                <Link href="/app/challenges" className="text-green-400 text-sm hover:underline mt-1 inline-block">Browse challenges →</Link>
              </div>
            ) : (
              joinedChallenges.map((cp) => (
                <div key={cp.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-700">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{cp.challenge.title}</p>
                    <div className="mt-1 h-1.5 bg-slate-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (cp.progress / cp.challenge.targetValue) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {cp.progress.toFixed(1)} / {cp.challenge.targetValue} · {cp.challenge.pointsReward} pts
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { href: '/app/activities/new', icon: Plus, label: 'Log Activity', color: 'bg-green-600' },
          { href: '/app/challenges', icon: Trophy, label: 'Challenges', color: 'bg-blue-600' },
          { href: '/app/rewards', icon: Gift, label: 'Rewards', color: 'bg-purple-600' },
          { href: '/app/leaderboards', icon: BarChart3, label: 'Leaderboard', color: 'bg-yellow-600' },
        ].map(({ href, icon: Icon, label, color }) => (
          <Link
            key={href}
            href={href}
            className={`${color} flex items-center gap-3 rounded-xl p-4 text-white hover:opacity-90 transition-opacity`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
