import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getFriendsLeaderboard } from '@/services/leaderboard'
import { LeaderboardRow } from '@/components/player/leaderboard-row'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Leaderboards | GG' }

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

const FILTER_TABS = [
  { key: 'global', label: 'Global' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'friends', label: 'Friends' },
]

const METRIC_TABS = [
  { key: 'points', label: 'Points', icon: 'stars' },
  { key: 'distance', label: 'Distance', icon: 'route' },
  { key: 'minutes', label: 'Time', icon: 'schedule' },
]

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; metric?: string }>
}) {
  const session = await getCurrentUser()
  if (!session) redirect('/login')

  const { filter = 'global', metric = 'points' } = await searchParams
  const safeMetric = (metric === 'distance' || metric === 'minutes') ? metric : 'points'
  const safeFilter = (['global', 'weekly', 'monthly', 'friends'] as const).includes(
    filter as 'global' | 'weekly' | 'monthly' | 'friends',
  )
    ? (filter as 'global' | 'weekly' | 'monthly' | 'friends')
    : 'global'

  const isFriends = safeFilter === 'friends'

  const [entries, friendsEntries] = await Promise.all([
    isFriends ? Promise.resolve([]) : getGlobalLeaderboard(safeMetric, 50),
    isFriends ? getFriendsLeaderboard(session.id, safeMetric) : Promise.resolve([]),
  ])

  const activeEntries = isFriends ? friendsEntries : entries
  const userRank = activeEntries.findIndex((e) => e.userId === session.id) + 1

  return (
    <div className="max-w-2xl mx-auto space-y-lg">
      {/* Header */}
      <div>
        <h1 className="text-headline-md font-black italic tracking-tight text-primary-fixed">
          Rankings
        </h1>
        <p className="text-label-caps text-on-surface-variant mt-xs">{activeEntries.length} players</p>
      </div>

      {/* Centre League shortcut */}
      <Link
        href="/app/leaderboards/centers"
        className="glass-card rounded-xl p-md flex items-center justify-between hover:bg-surface-container-high transition-colors active:scale-[0.99]"
      >
        <div className="flex items-center gap-md">
          <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-secondary" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>
              shield
            </span>
          </div>
          <div>
            <p className="text-body-md font-bold text-white">Centre League Table</p>
            <p className="text-label-caps text-on-surface-variant">Football-style ranking of all centres</p>
          </div>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '20px' }}>chevron_right</span>
      </Link>

      {/* Filter tabs */}
      <div className="flex gap-xs glass-card rounded-xl p-xs">
        {FILTER_TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`?filter=${tab.key}&metric=${safeMetric}`}
            className={cn(
              'flex-1 rounded-lg px-sm py-xs text-label-caps text-center transition-colors',
              safeFilter === tab.key
                ? 'bg-primary-fixed text-on-primary-fixed'
                : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Metric tabs */}
      <div className="flex gap-xs glass-card rounded-xl p-xs">
        {METRIC_TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`?filter=${safeFilter}&metric=${tab.key}`}
            className={cn(
              'flex-1 rounded-lg px-sm py-xs text-label-caps text-center transition-colors flex items-center justify-center gap-1',
              safeMetric === tab.key
                ? 'bg-secondary/20 text-secondary'
                : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px', fontVariationSettings: safeMetric === tab.key ? "'FILL' 1" : "'FILL' 0" }}>
              {tab.icon}
            </span>
            {tab.label}
          </Link>
        ))}
      </div>

      {/* User rank highlight */}
      {userRank > 0 && (
        <div className="glass-card rounded-xl p-sm border-l-4 border-l-primary-fixed flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary-fixed" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>
            emoji_events
          </span>
          <p className="text-label-caps text-on-surface">
            You&apos;re ranked <span className="text-primary-fixed font-black">#{userRank}</span>{' '}
            {isFriends ? 'among friends' : 'globally'} by {safeMetric}
          </p>
        </div>
      )}

      {/* Friends empty state */}
      {isFriends && friendsEntries.length === 0 && (
        <div className="glass-card rounded-xl p-md py-10 flex flex-col items-center text-center">
          <span className="material-symbols-outlined text-on-surface-variant mb-sm" style={{ fontSize: '40px' }}>group</span>
          <p className="text-body-md text-on-surface-variant">You aren&apos;t following anyone yet.</p>
          <Link href="/app/explore" className="text-label-caps text-primary-fixed mt-sm hover:opacity-80">
            Explore players →
          </Link>
        </div>
      )}

      {/* Rankings list */}
      {activeEntries.length > 0 && (
        <div className="glass-card rounded-xl p-sm space-y-xs">
          <p className="text-label-caps text-on-surface-variant px-sm pb-xs">
            {isFriends ? 'Friends' : safeFilter.charAt(0).toUpperCase() + safeFilter.slice(1)} · By {safeMetric}
          </p>
          {activeEntries.map((entry) => (
            <LeaderboardRow
              key={entry.userId}
              entry={entry}
              rank={entry.rank}
              isCurrentUser={entry.userId === session.id}
              metric={safeMetric}
            />
          ))}
        </div>
      )}
    </div>
  )
}
