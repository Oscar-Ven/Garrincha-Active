import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { toggleFollow } from '@/app/app/feed/actions'
import { getSportRatings } from '@/services/matches'
import { sportEloLabel } from '@/lib/match-elo'
import { Level } from '@/generated/prisma'
import type { ActivityType } from '@/generated/prisma'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await prisma.user.findUnique({ where: { id }, select: { name: true } })
  return { title: user ? `${user.name} | GG` : 'Player Profile' }
}

const LEVEL_LABEL: Record<Level, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Silver',
  GOLD: 'Gold',
  ELITE: 'Elite',
}

function sportIcon(type: ActivityType | string): string {
  const map: Partial<Record<string, string>> = {
    TENNIS: 'sports_tennis', PADEL: 'sports_tennis',
    SQUASH: 'sports_handball', BADMINTON: 'sports_badminton',
    PICKLEBALL: 'sports_tennis', RACQUETBALL: 'sports_handball',
    RUN: 'directions_run', WALK: 'directions_walk',
    CYCLING: 'directions_bike', FITNESS: 'fitness_center',
    FOOTBALL_TRAINING: 'sports_soccer', FOOTBALL_MATCH: 'sports_soccer',
  }
  return map[type as string] ?? 'sports'
}

function sportLabel(type: string): string {
  return type.replace(/_/g, ' ').split(' ').map(w => w[0] + w.slice(1).toLowerCase()).join(' ')
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('')
}

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

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const currentUser = await getCurrentUser()
  if (!currentUser) redirect('/login')

  const [player, isFollowing, matchesForPlayer, topSports, sportRatings] = await Promise.all([
    prisma.user.findFirst({
      where: { id, role: 'PLAYER' },
      include: {
        playerProfile: true,
        center: { select: { name: true, city: true } },
        userBadges: { include: { badge: true }, orderBy: { awardedAt: 'desc' } },
        _count: { select: { followers: true, following: true } },
      },
    }),
    prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: currentUser.id, followingId: id } },
    }),
    prisma.matchResult.findMany({
      where: { participants: { some: { userId: id } }, status: 'CONFIRMED' },
      select: {
        winnerSide: true,
        participants: { where: { userId: id }, select: { role: true } },
      },
    }),
    prisma.activity.groupBy({
      by: ['type'],
      where: { userId: id, status: 'APPROVED' },
      _count: { type: true },
      orderBy: [{ _count: { type: 'desc' } }],
      take: 4,
    }),
    getSportRatings(id),
  ])

  if (!player || !player.playerProfile) notFound()

  const { playerProfile: profile } = player
  const isSelf = currentUser.id === id

  const level = profile.level ?? Level.BRONZE

  // Win rate
  const totalConfirmed = matchesForPlayer.length
  const wonCount = matchesForPlayer.filter(m => {
    const p = m.participants[0]
    if (!m.winnerSide || !p) return false
    return (m.winnerSide === 'HOME' && (p.role === 'HOME' || p.role === 'HOME_PARTNER')) ||
           (m.winnerSide === 'AWAY' && (p.role === 'AWAY' || p.role === 'AWAY_PARTNER'))
  }).length
  const winRate = totalConfirmed > 0 ? Math.round((wonCount / totalConfirmed) * 100) : 0

  const nameInitials = initials(player.name)

  return (
    <div className="max-w-xl mx-auto space-y-lg">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center text-center space-y-md">
        {/* Avatar */}
        <div className="relative">
          <div
            className="w-32 h-32 rounded-full p-1 border-2 border-primary-fixed-dim"
            style={{ boxShadow: '0 0 30px rgba(171,214,0,0.2)' }}
          >
            <div className="w-full h-full rounded-full bg-surface-container-highest flex items-center justify-center text-4xl font-bold text-white select-none">
              {nameInitials}
            </div>
          </div>
          <div className="absolute bottom-1 right-1 bg-primary-fixed-dim text-on-primary-fixed px-3 py-0.5 rounded-full text-label-caps border-2 border-surface-container-lowest flex items-center gap-1">
            <div className="w-2 h-2 bg-on-primary-fixed rounded-full pulse-green" />
            {LEVEL_LABEL[level]}
          </div>
        </div>

        {/* Name / bio */}
        <div className="space-y-xs">
          <h2 className="text-headline-lg text-on-surface">{player.name}</h2>
          {player.center && (
            <p className="text-label-caps text-on-surface-variant flex items-center justify-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>location_on</span>
              {player.center.name}{player.center.city ? `, ${player.center.city}` : ''}
            </p>
          )}
          <p className="text-body-md text-on-surface-variant max-w-xs mx-auto">
            {profile.bio ?? `@${player.nickname} · ${player._count.followers} followers`}
          </p>
        </div>

        {/* Action buttons */}
        {!isSelf && (
          <div className="flex gap-md w-full pt-md">
            <form
              action={async () => { 'use server'; await toggleFollow(id) }}
              className="flex-1"
            >
              <button
                type="submit"
                className="w-full bg-primary-fixed-dim text-on-primary-fixed font-bold text-label-caps py-3 rounded-xl action-glow active:scale-95 transition-all"
              >
                {isFollowing ? 'UNFOLLOW' : 'FOLLOW'}
              </button>
            </form>
            <form action={startConversation.bind(null, currentUser.id, id)}>
              <button
                type="submit"
                className="flex items-center justify-center border-2 border-secondary-container text-secondary-container px-4 py-3 rounded-xl active:scale-95 transition-all"
                aria-label="Message"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>chat_bubble</span>
              </button>
            </form>
          </div>
        )}
        {isSelf && (
          <Link
            href="/app/profile"
            className="w-full bg-primary-fixed-dim text-on-primary-fixed font-bold text-label-caps py-3 rounded-xl action-glow active:scale-95 transition-all text-center mt-md"
          >
            EDIT PROFILE
          </Link>
        )}
      </section>

      {/* ── Stats Bento ──────────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-md">
        {/* Win Rate */}
        <div className="glass-card rounded-xl p-md flex flex-col justify-between aspect-square">
          <span className="text-label-caps text-on-surface-variant">Win Rate</span>
          <div className="flex flex-col items-center justify-center flex-1">
            <span className="text-stats-xl text-primary-fixed-dim">{winRate}%</span>
            <div className="w-full bg-surface-container-highest h-1 rounded-full mt-sm overflow-hidden">
              <div
                className="bg-primary-fixed-dim h-full rounded-full transition-all"
                style={{ width: `${winRate}%` }}
              />
            </div>
            <p className="text-label-caps text-on-surface-variant mt-xs">
              {wonCount}W / {totalConfirmed - wonCount}L
            </p>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-md">
          <div className="glass-card rounded-xl p-md flex-1 flex flex-col justify-between">
            <span className="text-label-caps text-on-surface-variant">Matches</span>
            <span className="text-headline-md text-on-surface">{totalConfirmed}</span>
          </div>
          <div className="glass-card rounded-xl p-md flex-1 flex flex-col justify-between">
            <span className="text-label-caps text-on-surface-variant">Elo Rating</span>
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-primary-fixed-dim"
                style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
              >
                verified
              </span>
              <span className="text-headline-md text-on-surface">{profile.eloRating}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sports Played ────────────────────────────────────────── */}
      {topSports.length > 0 && (
        <section className="space-y-sm">
          <h3 className="text-label-caps text-on-surface-variant px-xs">Sports Played</h3>
          <div className="flex gap-sm flex-wrap">
            {topSports.map(({ type }) => (
              <div
                key={type}
                className="bg-surface-container rounded-xl px-4 py-3 flex items-center gap-3 border border-outline-variant/30"
              >
                <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>
                  {sportIcon(type)}
                </span>
                <span className="text-label-caps text-on-surface">{sportLabel(type)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Sport Ratings ────────────────────────────────────────── */}
      {sportRatings.length > 0 && (
        <section className="space-y-sm">
          <h3 className="text-label-caps text-on-surface-variant px-xs">Sport Ratings</h3>
          <div className="grid grid-cols-2 gap-sm">
            {sportRatings.map(r => (
              <div key={r.id} className="glass-card rounded-xl p-md">
                <div className="flex items-center gap-2 mb-xs">
                  <span className="material-symbols-outlined text-secondary" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>
                    {sportIcon(r.sport)}
                  </span>
                  <span className="text-label-caps text-on-surface-variant">{sportLabel(r.sport)}</span>
                </div>
                <p className="text-headline-md text-on-surface">{r.rating}</p>
                <p className="text-label-caps text-secondary">{sportEloLabel(r.rating)}</p>
                <p className="text-label-caps text-on-surface-variant mt-xs">{r.wins}W / {r.losses}L</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Trophy Cabinet ───────────────────────────────────────── */}
      <section className="space-y-sm">
        <h3 className="text-label-caps text-on-surface-variant px-xs">Trophy Cabinet</h3>
        {player.userBadges.length === 0 ? (
          <div className="glass-card rounded-xl p-md py-8 text-center text-on-surface-variant text-label-caps">
            No trophies yet.
          </div>
        ) : (
          <div className="glass-card rounded-xl p-md overflow-x-auto scrollbar-none">
            <div className="flex gap-lg min-w-max">
              {player.userBadges.slice(0, 10).map(ub => (
                <div key={ub.id} className="flex flex-col items-center gap-2 w-17.5">
                  <div className="w-14 h-14 rounded-full border-2 border-primary-fixed-dim flex items-center justify-center bg-primary-fixed/10">
                    <span
                      className="material-symbols-outlined text-primary-fixed-dim"
                      style={{ fontSize: '28px', fontVariationSettings: "'FILL' 1" }}
                    >
                      military_tech
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-on-surface-variant text-center leading-tight uppercase">
                    {ub.badge.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Challenge ────────────────────────────────────────────── */}
      {!isSelf && (
        <Link
          href={`/app/challenges/direct/new?challengee=${id}`}
          className="glass-card rounded-xl p-md flex items-center gap-md hover:bg-surface-container-high transition-colors active:scale-95"
        >
          <div className="w-10 h-10 rounded-lg bg-primary-fixed/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary-fixed" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>
              sports_kabaddi
            </span>
          </div>
          <div>
            <p className="text-body-md font-bold text-white">Challenge {player.name.split(' ')[0]}</p>
            <p className="text-label-caps text-on-surface-variant">Send a 1v1 duel invite</p>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant ml-auto" style={{ fontSize: '20px' }}>
            chevron_right
          </span>
        </Link>
      )}
    </div>
  )
}
