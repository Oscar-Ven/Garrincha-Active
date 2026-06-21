import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ActivityType, Level } from '@/generated/prisma'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Explore' }

// ─── Server actions ────────────────────────────────────────────────────────────

async function toggleFollow(formData: FormData) {
  'use server'
  const { getCurrentUser } = await import('@/lib/auth')
  const { prisma } = await import('@/lib/db')

  const session = await getCurrentUser()
  if (!session) return

  const targetId = formData.get('targetId') as string
  if (!targetId || targetId === session.id) return

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: session.id, followingId: targetId } },
  })

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } })
  } else {
    await prisma.follow.create({ data: { followerId: session.id, followingId: targetId } })
  }

  revalidatePath('/app/explore')
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

const LEVEL_COLORS: Record<Level, string> = {
  BRONZE: 'text-[#CD7F32] bg-[#CD7F32]/10 border-[#CD7F32]/30',
  SILVER: 'text-[#C0C0C0] bg-[#C0C0C0]/10 border-[#C0C0C0]/30',
  GOLD:   'text-[#FFD700] bg-[#FFD700]/10 border-[#FFD700]/30',
  ELITE:  'text-secondary bg-secondary/10 border-secondary/30',
}

const ACTIVITY_ICON: Record<string, string> = {
  RUN:               'directions_run',
  CYCLING:           'directions_bike',
  FOOTBALL_TRAINING: 'sports_soccer',
  FOOTBALL_MATCH:    'sports_soccer',
  FITNESS:           'fitness_center',
  WALK:              'directions_walk',
}

function ActivityIcon({ type }: { type: ActivityType }) {
  return (
    <span
      className="material-symbols-outlined text-primary-fixed shrink-0"
      style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
    >
      {ACTIVITY_ICON[type as string] ?? 'sports'}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const session = await getCurrentUser()
  if (!session) redirect('/login')

  const { tab = 'players' } = await searchParams
  const safeTab = ['players', 'activities', 'routes'].includes(tab) ? tab : 'players'

  const [players, activities, routes, followingIds] = await Promise.all([
    safeTab === 'players'
      ? prisma.user.findMany({
          where: { id: { not: session.id }, isActive: true },
          take: 30,
          orderBy: { playerProfile: { totalPoints: 'desc' } },
          select: {
            id: true,
            name: true,
            nickname: true,
            avatarUrl: true,
            playerProfile: { select: { level: true, totalPoints: true } },
          },
        })
      : Promise.resolve([]),

    safeTab === 'activities'
      ? prisma.activity.findMany({
          where: { visibility: 'PUBLIC', status: 'APPROVED' },
          take: 30,
          orderBy: { startedAt: 'desc' },
          select: {
            id: true,
            title: true,
            type: true,
            distanceKm: true,
            durationMinutes: true,
            pointsEarned: true,
            startedAt: true,
            user: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
          },
        })
      : Promise.resolve([]),

    safeTab === 'routes'
      ? prisma.route.findMany({
          where: { isPublic: true },
          take: 30,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            type: true,
            distanceKm: true,
            difficulty: true,
          },
        })
      : Promise.resolve([]),

    prisma.follow.findMany({
      where: { followerId: session.id },
      select: { followingId: true },
    }),
  ])

  const followingSet = new Set(followingIds.map((f) => f.followingId))
  const tabs = ['players', 'activities', 'routes'] as const
  const TAB_ICONS: Record<string, string> = { players: 'group', activities: 'bolt', routes: 'map' }

  return (
    <div className="space-y-lg">
      <div className="flex items-center gap-sm">
        <div className="w-10 h-10 rounded-xl bg-primary-fixed/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary-fixed" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>explore</span>
        </div>
        <h1 className="text-headline-md font-black italic tracking-tight text-primary-fixed">Explore</h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-xs glass-card rounded-xl p-xs">
        {tabs.map((t) => (
          <Link
            key={t}
            href={`?tab=${t}`}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 rounded-lg px-sm py-xs text-label-caps transition-colors',
              safeTab === t
                ? 'bg-primary-fixed text-on-primary-fixed'
                : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '14px', fontVariationSettings: safeTab === t ? "'FILL' 1" : "'FILL' 0" }}
            >
              {TAB_ICONS[t]}
            </span>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Link>
        ))}
      </div>

      {/* ── Players tab ── */}
      {safeTab === 'players' && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-md py-sm border-b border-white/5">
            <p className="text-label-caps text-on-surface-variant">Active Players</p>
          </div>
          <div className="divide-y divide-white/5">
            {players.length === 0 ? (
              <p className="text-on-surface-variant text-label-caps text-center py-8">No players found.</p>
            ) : (
              players.map((player) => {
                const level = player.playerProfile?.level ?? 'BRONZE'
                const points = player.playerProfile?.totalPoints ?? 0
                const isFollowing = followingSet.has(player.id)

                return (
                  <div key={player.id} className="flex items-center gap-md px-md py-sm hover:bg-surface-container-high transition-colors">
                    <div className="w-10 h-10 rounded-full bg-surface-container-highest border-2 border-white/10 flex items-center justify-center text-on-surface font-bold text-sm shrink-0 select-none overflow-hidden">
                      {player.avatarUrl
                        ? <img src={player.avatarUrl} alt={player.name} className="h-full w-full object-cover" />
                        : getInitials(player.name)
                      }
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-body-md font-bold text-on-surface truncate">{player.name}</span>
                        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide', LEVEL_COLORS[level as Level])}>
                          {level}
                        </span>
                      </div>
                      <p className="text-label-caps text-on-surface-variant leading-tight">
                        @{player.nickname} · {points.toLocaleString()} pts
                      </p>
                    </div>

                    <form action={toggleFollow}>
                      <input type="hidden" name="targetId" value={player.id} />
                      <button
                        type="submit"
                        className={cn(
                          'shrink-0 text-label-caps font-bold px-md py-xs rounded-lg transition-colors',
                          isFollowing
                            ? 'glass-card text-on-surface-variant hover:text-on-surface'
                            : 'bg-primary-fixed text-on-primary-fixed hover:opacity-90',
                        )}
                      >
                        {isFollowing ? 'Unfollow' : 'Follow'}
                      </button>
                    </form>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ── Activities tab ── */}
      {safeTab === 'activities' && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-md py-sm border-b border-white/5">
            <p className="text-label-caps text-on-surface-variant">Recent Public Activities</p>
          </div>
          <div className="divide-y divide-white/5">
            {activities.length === 0 ? (
              <p className="text-on-surface-variant text-label-caps text-center py-8">No activities yet.</p>
            ) : (
              activities.map((act) => (
                <Link
                  key={act.id}
                  href={`/app/activities/${act.id}`}
                  className="flex items-center gap-md px-md py-sm hover:bg-surface-container-high transition-colors"
                >
                  <ActivityIcon type={act.type as ActivityType} />
                  <div className="min-w-0 flex-1">
                    <p className="text-body-md font-bold text-on-surface truncate">{act.title}</p>
                    <p className="text-label-caps text-on-surface-variant">
                      {act.user.name}
                      {act.distanceKm != null && ` · ${act.distanceKm.toFixed(2)} km`}
                      {` · ${act.durationMinutes} min`}
                      {` · ${act.pointsEarned} pts`}
                    </p>
                  </div>
                  <span
                    className="material-symbols-outlined text-[#FFD700] shrink-0"
                    style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
                  >
                    bolt
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Routes tab ── */}
      {safeTab === 'routes' && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-md py-sm border-b border-white/5">
            <p className="text-label-caps text-on-surface-variant">Public Routes</p>
          </div>
          <div className="divide-y divide-white/5">
            {routes.length === 0 ? (
              <p className="text-on-surface-variant text-label-caps text-center py-8">No routes yet.</p>
            ) : (
              routes.map((route) => (
                <Link
                  key={route.id}
                  href={`/app/routes/${route.id}`}
                  className="flex items-center gap-md px-md py-sm hover:bg-surface-container-high transition-colors"
                >
                  <span
                    className="material-symbols-outlined text-secondary shrink-0"
                    style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
                  >
                    map
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-body-md font-bold text-on-surface truncate">{route.title}</p>
                    <p className="text-label-caps text-on-surface-variant capitalize">
                      {route.type.replace(/_/g, ' ').toLowerCase()}
                      {` · ${route.distanceKm.toFixed(2)} km`}
                      {route.difficulty && ` · ${route.difficulty}`}
                    </p>
                  </div>
                  <span
                    className="material-symbols-outlined text-on-surface-variant shrink-0"
                    style={{ fontSize: '18px' }}
                  >
                    flag
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
