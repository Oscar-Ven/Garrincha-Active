import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ActivityCard } from '@/components/player/activity-card'
import { formatDistance, formatDuration, formatDate } from '@/lib/utils'
import { Settings, Award, Activity, Clock, MapPin } from 'lucide-react'

export default async function ProfilePage() {
  const session = await getCurrentUser()
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      playerProfile: true,
      center: { select: { name: true, city: true } },
      userBadges: { include: { badge: true }, orderBy: { awardedAt: 'desc' } },
      _count: { select: { followers: true, following: true } },
    },
  })

  if (!user) redirect('/login')

  const recentActivities = await prisma.activity.findMany({
    where: { userId: session.id, status: 'APPROVED' },
    orderBy: { startedAt: 'desc' },
    take: 5,
    include: { user: { select: { name: true, nickname: true, avatarUrl: true } } },
  })

  const pointsHistory = await prisma.pointsLedger.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  // 90-day tier calculation
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const ninetyDayMinutesResult = await prisma.activity.aggregate({
    where: { userId: session.id, status: 'APPROVED', startedAt: { gte: ninetyDaysAgo } },
    _sum: { durationMinutes: true },
  })
  const ninetyDayMinutes = ninetyDayMinutesResult._sum.durationMinutes ?? 0

  const profile = user.playerProfile
  const levelColors: Record<string, string> = {
    BRONZE: 'bg-amber-600',
    SILVER: 'bg-slate-400',
    GOLD: 'bg-yellow-500',
    ELITE: 'bg-purple-500',
  }
  const levelColor = levelColors[profile?.level ?? 'BRONZE'] ?? 'bg-amber-600'

  // Garrincha loyalty tier (90-day minutes based)
  const TIERS = [
    {
      key: 'MEMBER',
      level: 'BRONZE',
      minMinutes: 0,
      nextMinutes: 270,
      color: 'from-amber-600 to-amber-700',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-600/30',
      bgColor: 'bg-amber-600/10',
      benefits: ['Access to all Garrincha facilities', 'Earn points on every activity', 'Community feed access'],
    },
    {
      key: 'RISING STAR',
      level: 'SILVER',
      minMinutes: 270,
      nextMinutes: 630,
      color: 'from-slate-400 to-slate-500',
      textColor: 'text-slate-300',
      borderColor: 'border-slate-500/30',
      bgColor: 'bg-slate-500/10',
      benefits: ['Priority booking (48h window)', '5% discount on all sessions', 'Access to Rising Star events'],
    },
    {
      key: 'STAR',
      level: 'GOLD',
      minMinutes: 630,
      nextMinutes: 1080,
      color: 'from-yellow-500 to-yellow-600',
      textColor: 'text-yellow-400',
      borderColor: 'border-yellow-500/30',
      bgColor: 'bg-yellow-500/10',
      benefits: ['Priority booking (72h window)', '10% discount on all sessions', 'Exclusive merchandise offers', 'Star lounge access'],
    },
    {
      key: 'ALL-STAR',
      level: 'ELITE',
      minMinutes: 1080,
      nextMinutes: null,
      color: 'from-purple-500 to-purple-600',
      textColor: 'text-purple-400',
      borderColor: 'border-purple-500/30',
      bgColor: 'bg-purple-500/10',
      benefits: ['VIP booking (7-day window)', '20% discount on all sessions', 'Free merchandise annually', 'Exclusive events & tournaments', 'Personal coach consultation'],
    },
  ] as const

  type TierKey = typeof TIERS[number]['key']
  const currentTierData = TIERS.slice().reverse().find((t) => ninetyDayMinutes >= t.minMinutes) ?? TIERS[0]
  const nextTierData = TIERS.find((t) => t.minMinutes > (currentTierData.minMinutes ?? 0)) ?? null
  const progressPct = nextTierData
    ? Math.min(100, Math.round(((ninetyDayMinutes - currentTierData.minMinutes) / (nextTierData.minMinutes - currentTierData.minMinutes)) * 100))
    : 100

  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="h-20 w-20 rounded-2xl bg-slate-600 flex items-center justify-center text-2xl font-bold text-white">
                {initials}
              </div>
              <span className={`absolute -bottom-1 -right-1 text-xs font-bold text-white px-2 py-0.5 rounded-full ${levelColor}`}>
                {profile?.level ?? 'BRONZE'}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-xl font-bold text-white">{user.name}</h1>
                  <p className="text-slate-400">@{user.nickname}</p>
                  {user.center && (
                    <p className="flex items-center gap-1 text-sm text-slate-400 mt-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {user.center.name}
                      {user.center.city ? `, ${user.center.city}` : ''}
                    </p>
                  )}
                  {profile?.favoriteSport && (
                    <p className="text-sm text-slate-400">⚽ {profile.favoriteSport}</p>
                  )}
                </div>
                <Link
                  href="/app/settings"
                  className="flex items-center gap-1.5 text-sm text-slate-300 border border-slate-600 rounded-lg px-3 py-1.5 hover:bg-slate-700 transition-colors"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Edit Profile
                </Link>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-6 mt-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{profile?.totalPoints ?? 0}</p>
                  <p className="text-xs text-slate-400">Points</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{profile?.totalActivities ?? 0}</p>
                  <p className="text-xs text-slate-400">Activities</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{(profile?.totalDistance ?? 0).toFixed(1)}km</p>
                  <p className="text-xs text-slate-400">Distance</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{user._count.followers}</p>
                  <p className="text-xs text-slate-400">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{user._count.following}</p>
                  <p className="text-xs text-slate-400">Following</p>
                </div>
              </div>
            </div>
          </div>

          {/* Badges */}
          {user.userBadges.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-700">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Award className="h-3.5 w-3.5" /> Badges
              </p>
              <div className="flex flex-wrap gap-2">
                {user.userBadges.slice(0, 8).map((ub) => (
                  <div
                    key={ub.id}
                    title={ub.badge.description}
                    className="flex items-center gap-1.5 rounded-full bg-slate-700 border border-slate-600 px-3 py-1 text-xs text-slate-200"
                  >
                    🏅 {ub.badge.name}
                  </div>
                ))}
                {user.userBadges.length > 8 && (
                  <div className="rounded-full bg-slate-700 border border-slate-600 px-3 py-1 text-xs text-slate-400">
                    +{user.userBadges.length - 8} more
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Loyalty Tier Card ──────────────────────────────────── */}
      <div className={`rounded-2xl border ${currentTierData.borderColor} ${currentTierData.bgColor} p-6`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Loyalty Tier</p>
            <p className={`text-3xl font-black ${currentTierData.textColor}`}>{currentTierData.key}</p>
            <p className="mt-1 text-xs text-slate-400">
              {ninetyDayMinutes.toLocaleString()} min · last 90 days
            </p>
          </div>
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br ${currentTierData.color} text-3xl shadow-lg`}>
            {currentTierData.key === 'MEMBER' && '⭐'}
            {currentTierData.key === 'RISING STAR' && '🌟'}
            {currentTierData.key === 'STAR' && '💫'}
            {currentTierData.key === 'ALL-STAR' && '🏆'}
          </div>
        </div>

        {/* Progress bar */}
        {nextTierData && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-1.5 text-xs text-slate-400">
              <span>{ninetyDayMinutes} min</span>
              <span>{nextTierData.minMinutes} min to {nextTierData.key}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
              <div
                className={`h-full rounded-full bg-linear-to-r ${currentTierData.color} transition-all`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {Math.max(0, nextTierData.minMinutes - ninetyDayMinutes)} more minutes to unlock {nextTierData.key}
            </p>
          </div>
        )}

        {/* Tier benefits */}
        <div className="mt-5 pt-5 border-t border-white/10">
          <p className="text-xs font-semibold text-slate-400 mb-2">Your {currentTierData.key} Benefits</p>
          <ul className="space-y-1.5">
            {currentTierData.benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-slate-300">
                <span className={`mt-0.5 text-xs ${currentTierData.textColor}`}>✓</span>
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* All tiers */}
        <div className="mt-5 pt-5 border-t border-white/10">
          <p className="text-xs font-semibold text-slate-400 mb-3">Tier Roadmap</p>
          <div className="flex gap-2">
            {TIERS.map((t) => {
              const isActive = t.key === currentTierData.key
              const isPast = t.minMinutes < currentTierData.minMinutes
              return (
                <div
                  key={t.key}
                  className={`flex-1 rounded-xl border px-2 py-2 text-center text-xs transition-all ${
                    isActive
                      ? `${t.borderColor} ${t.bgColor} ${t.textColor} font-bold`
                      : isPast
                      ? 'border-slate-700 text-green-500 font-medium'
                      : 'border-slate-700 text-slate-600'
                  }`}
                >
                  <p className="font-semibold leading-tight">{t.key === 'RISING STAR' ? 'RISING' : t.key === 'ALL-STAR' ? 'ALL-★' : t.key}</p>
                  <p className="mt-0.5 text-[10px] opacity-70">{t.minMinutes}m</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Recent Activities
            </CardTitle>
            <Link href="/app/activities" className="text-xs text-green-400 hover:text-green-300">View all →</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivities.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No activities yet.</p>
            ) : (
              recentActivities.map((a) => <ActivityCard key={a.id} activity={a} compact />)
            )}
          </CardContent>
        </Card>

        {/* Points History */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Points History
            </CardTitle>
            <Link href="/app/wallet" className="text-xs text-green-400 hover:text-green-300">Full history →</Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pointsHistory.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">No points history yet.</p>
              ) : (
                pointsHistory.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between py-1.5 border-b border-slate-700 last:border-0">
                    <div>
                      <p className="text-sm text-slate-200">{entry.reason}</p>
                      <p className="text-xs text-slate-500">{formatDate(entry.createdAt)}</p>
                    </div>
                    <span className={`text-sm font-semibold ${entry.points >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {entry.points >= 0 ? '+' : ''}{entry.points}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
