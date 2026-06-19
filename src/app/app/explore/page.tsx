import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Compass,
  Users,
  Activity,
  Map,
  Footprints,
  Bike,
  Trophy,
  Dumbbell,
  Heart,
  Zap,
  Flag,
} from 'lucide-react'
import { ActivityType, Level } from '@/generated/prisma'

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
  BRONZE: 'text-amber-600 bg-amber-900/30 border-amber-700/40',
  SILVER: 'text-slate-300 bg-slate-700/30 border-slate-500/40',
  GOLD: 'text-yellow-400 bg-yellow-900/30 border-yellow-600/40',
  ELITE: 'text-purple-400 bg-purple-900/30 border-purple-600/40',
}

function ActivityIcon({ type }: { type: ActivityType }) {
  const cls = 'h-5 w-5 shrink-0'
  switch (type) {
    case 'RUN':
      return <Footprints className={cls} />
    case 'CYCLING':
      return <Bike className={cls} />
    case 'FOOTBALL_TRAINING':
    case 'FOOTBALL_MATCH':
      return <Trophy className={cls} />
    case 'FITNESS':
      return <Dumbbell className={cls} />
    case 'WALK':
      return <Heart className={cls} />
    default:
      return <Activity className={cls} />
  }
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

  // Fetch data for the active tab only
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Compass className="h-6 w-6 text-green-400" /> Explore
      </h1>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-slate-800 p-1 w-fit">
        {tabs.map((t) => (
          <Link
            key={t}
            href={`?tab=${t}`}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
              safeTab === t ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t === 'players' && <Users className="inline h-4 w-4 mr-1.5 -mt-0.5" />}
            {t === 'activities' && <Activity className="inline h-4 w-4 mr-1.5 -mt-0.5" />}
            {t === 'routes' && <Map className="inline h-4 w-4 mr-1.5 -mt-0.5" />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Link>
        ))}
      </div>

      {/* ── Players tab ── */}
      {safeTab === 'players' && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">Active Players</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-700">
              {players.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No players found.</p>
              ) : (
                players.map((player) => {
                  const level = player.playerProfile?.level ?? 'BRONZE'
                  const points = player.playerProfile?.totalPoints ?? 0
                  const isFollowing = followingSet.has(player.id)

                  return (
                    <div key={player.id} className="flex items-center gap-3 px-4 py-3">
                      <Avatar size="sm" className="shrink-0">
                        {player.avatarUrl && (
                          <AvatarImage src={player.avatarUrl} alt={player.name} />
                        )}
                        <AvatarFallback>{getInitials(player.name)}</AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white truncate">
                            {player.name}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ${LEVEL_COLORS[level as Level]}`}
                          >
                            {level}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-tight">
                          @{player.nickname} &middot; {points.toLocaleString()} pts
                        </p>
                      </div>

                      <form action={toggleFollow}>
                        <input type="hidden" name="targetId" value={player.id} />
                        <button
                          type="submit"
                          className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
                            isFollowing
                              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              : 'bg-green-600 text-white hover:bg-green-500'
                          }`}
                        >
                          {isFollowing ? 'Unfollow' : 'Follow'}
                        </button>
                      </form>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Activities tab ── */}
      {safeTab === 'activities' && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">Recent Public Activities</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-700">
              {activities.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No activities yet.</p>
              ) : (
                activities.map((act) => (
                  <Link
                    key={act.id}
                    href={`/app/activities/${act.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700/40 transition-colors"
                  >
                    <div className="text-green-400 shrink-0">
                      <ActivityIcon type={act.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{act.title}</p>
                      <p className="text-xs text-slate-400">
                        {act.user.name}
                        {act.distanceKm != null && ` · ${act.distanceKm.toFixed(2)} km`}
                        {` · ${act.durationMinutes} min`}
                        {` · ${act.pointsEarned} pts`}
                      </p>
                    </div>
                    <Zap className="h-4 w-4 text-yellow-400 shrink-0" />
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Routes tab ── */}
      {safeTab === 'routes' && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">Public Routes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-700">
              {routes.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No routes yet.</p>
              ) : (
                routes.map((route) => (
                  <Link
                    key={route.id}
                    href={`/app/routes/${route.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700/40 transition-colors"
                  >
                    <Map className="h-5 w-5 text-blue-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{route.title}</p>
                      <p className="text-xs text-slate-400 capitalize">
                        {route.type.replace(/_/g, ' ').toLowerCase()}
                        {` · ${route.distanceKm.toFixed(2)} km`}
                        {route.difficulty && ` · ${route.difficulty}`}
                      </p>
                    </div>
                    <Flag className="h-4 w-4 text-slate-500 shrink-0" />
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
