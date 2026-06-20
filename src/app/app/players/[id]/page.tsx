import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { toggleFollow } from '@/app/app/feed/actions'
import { ActivityType } from '@/generated/prisma'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserCheck, UserPlus, MapPin, MessageSquare, Flame, Leaf, Trophy } from 'lucide-react'

async function startConversation(currentUserId: string, otherId: string): Promise<void> {
  'use server'
  const [pa, pb] = currentUserId < otherId ? [currentUserId, otherId] : [otherId, currentUserId]
  const conv = await prisma.conversation.upsert({
    where: { participantA_participantB: { participantA: pa, participantB: pb } },
    create: { participantA: pa, participantB: pb },
    update: {},
    select: { id: true },
  })
  redirect(`/app/messages/${conv.id}`)
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await prisma.user.findUnique({ where: { id }, select: { name: true } })
  return { title: user ? `${user.name} | Garrincha Active` : 'Player' }
}

const TYPE_EMOJI: Record<ActivityType, string> = {
  RUN: '🏃', WALK: '🚶', CYCLING: '🚴', FOOTBALL_TRAINING: '⚽',
  FOOTBALL_MATCH: '🏟️', FITNESS: '💪', CUSTOM: '🎯',
  PADEL: '🎾', TENNIS: '🎾', SQUASH: '🏸', PICKLEBALL: '🏓', BADMINTON: '🏸', RACQUETBALL: '🎾',
}

function getInitials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const currentUser = await getCurrentUser()
  if (!currentUser) redirect('/login')

  const [player, isFollowing] = await Promise.all([
    prisma.user.findFirst({
      where: { id, role: 'PLAYER' },
      include: {
        playerProfile: true,
        center: { select: { name: true, city: true } },
        activities: {
          where: { status: 'APPROVED', visibility: { in: ['PUBLIC', 'FOLLOWERS'] } },
          orderBy: { startedAt: 'desc' },
          take: 8,
          select: { id: true, title: true, type: true, distanceKm: true, durationMinutes: true, startedAt: true },
        },
        personalRecords: {
          orderBy: { recordedAt: 'desc' },
          take: 6,
        },
        userBadges: {
          include: { badge: true },
          orderBy: { awardedAt: 'desc' },
          take: 12,
        },
        _count: { select: { followers: true, following: true, activities: true } },
      },
    }),
    prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: currentUser.id, followingId: id } },
    }),
  ])

  if (!player || !player.playerProfile) notFound()

  const { playerProfile: profile } = player
  const isSelf = currentUser.id === id

  const PR_LABELS: Record<string, string> = {
    FASTEST_1KM: 'Fastest 1 km', FASTEST_5KM: 'Fastest 5 km',
    FASTEST_10KM: 'Fastest 10 km', LONGEST_RUN: 'Longest Run',
    LONGEST_RIDE: 'Longest Ride', MOST_ACTIVITIES_WEEK: 'Best Week',
  }

  function formatPR(type: string, value: number) {
    if (type.startsWith('FASTEST')) {
      const m = Math.floor(value / 60); const s = Math.round(value % 60)
      return `${m}m ${s.toString().padStart(2, '0')}s`
    }
    if (type === 'MOST_ACTIVITIES_WEEK') return `${value} activities`
    return `${value.toFixed(1)} km`
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Profile header */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar size="lg" className="shrink-0 h-20 w-20">
              {player.avatarUrl && <AvatarImage src={player.avatarUrl} alt={player.name} />}
              <AvatarFallback className="text-xl">{getInitials(player.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white">{player.name}</h1>
              <p className="text-slate-400 text-sm">@{player.nickname}</p>
              {player.center && (
                <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {player.center.name}{player.center.city ? `, ${player.center.city}` : ''}
                </p>
              )}
              {profile.bio && <p className="text-slate-300 text-sm mt-2">{profile.bio}</p>}

              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="text-white font-semibold">{player._count.followers}</span>
                <span className="text-slate-400">followers</span>
                <span className="text-white font-semibold">{player._count.following}</span>
                <span className="text-slate-400">following</span>
                <span className="text-white font-semibold">{player._count.activities}</span>
                <span className="text-slate-400">activities</span>
              </div>
            </div>

            {!isSelf && (
              <div className="flex flex-col gap-2">
                <form action={async () => { 'use server'; await toggleFollow(id) }}>
                  <button
                    type="submit"
                    className={`flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      isFollowing
                        ? 'border border-slate-600 text-slate-300 hover:border-red-600 hover:text-red-400'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {isFollowing ? <><UserCheck className="h-4 w-4" /> Following</> : <><UserPlus className="h-4 w-4" /> Follow</>}
                  </button>
                </form>
                <form action={startConversation.bind(null, currentUser.id, id)}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:border-slate-400 hover:text-white transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" /> Message
                  </button>
                </form>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Points', value: profile.totalPoints.toLocaleString(), unit: 'pts', color: 'text-yellow-400' },
          { label: 'Distance', value: profile.totalDistance.toFixed(1), unit: 'km', color: 'text-blue-400' },
          { label: 'Streak', value: profile.streakDays.toString(), unit: 'days', color: 'text-orange-400' },
          { label: 'CO₂ Saved', value: (profile.carbonSavedKg ?? 0).toFixed(1), unit: 'kg', color: 'text-green-400' },
        ].map((s) => (
          <Card key={s.label} className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400">{s.unit}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Personal Records */}
      {player.personalRecords.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-400" /> Personal Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {player.personalRecords.map((pr) => (
                <div key={pr.id} className="rounded-lg bg-slate-700/40 p-3">
                  <p className="text-xs text-slate-400">{PR_LABELS[pr.type] ?? pr.type}</p>
                  <p className="text-white font-bold text-lg">{formatPR(pr.type, pr.value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Badges */}
      {player.userBadges.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base">Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {player.userBadges.map((ub) => (
                <div
                  key={ub.id}
                  title={ub.badge.description}
                  className="flex items-center gap-1.5 rounded-full border border-yellow-700/40 bg-yellow-900/20 px-3 py-1 text-xs font-medium text-yellow-300"
                >
                  🏅 {ub.badge.name}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activities */}
      {player.activities.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base">Recent Activities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {player.activities.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg bg-slate-700/30 px-3 py-2">
                <span className="text-lg">{TYPE_EMOJI[a.type as ActivityType]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{a.title}</p>
                  <p className="text-xs text-slate-400">
                    {a.distanceKm ? `${a.distanceKm.toFixed(1)} km · ` : ''}{a.durationMinutes} min
                  </p>
                </div>
                <p className="text-xs text-slate-500 shrink-0">
                  {new Date(a.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!isSelf && (
        <Link href={`/app/challenges/direct/new?challengee=${id}`} className="inline-flex items-center gap-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 text-sm font-medium transition-colors">
          ⚔️ Challenge {player.name.split(' ')[0]} to a 1v1
        </Link>
      )}
    </div>
  )
}
