import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLevelThreshold } from '@/lib/utils'
import { getSportRatings } from '@/services/matches'
import { sportEloLabel } from '@/lib/match-elo'
import { Level, ActivityType } from '@/generated/prisma'
import StravaSection from './StravaSection'

export const revalidate = 60

interface ProfilePageProps {
  searchParams: Promise<{ strava?: string; error?: string; athlete?: string }>
}

const LEVEL_LABEL: Record<Level, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Silver',
  GOLD: 'Gold',
  ELITE: 'Elite',
}

const LEVEL_NEXT: Record<Level, number> = {
  BRONZE: 500,
  SILVER: 2000,
  GOLD: 5000,
  ELITE: 5000,
}

function xpPercent(level: Level, pts: number): number {
  if (level === Level.ELITE) return 100
  const floor = getLevelThreshold(level)
  const ceil = LEVEL_NEXT[level]
  return Math.min(100, Math.max(0, Math.round(((pts - floor) / (ceil - floor)) * 100)))
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

// Loyalty tier config
const TIERS = [
  { key: 'MEMBER',      minMinutes: 0,    nextMinutes: 270,  color: 'from-amber-600 to-amber-700', textColor: 'text-amber-400', borderColor: 'border-amber-600/30', bgColor: 'bg-amber-600/10', benefits: ['Access to all Garrincha facilities', 'Earn points on every activity', 'Community feed access'] },
  { key: 'RISING STAR', minMinutes: 270,  nextMinutes: 630,  color: 'from-slate-400 to-slate-500', textColor: 'text-slate-300', borderColor: 'border-slate-500/30',  bgColor: 'bg-slate-500/10',  benefits: ['Priority booking (48h window)', '5% discount on all sessions', 'Rising Star events'] },
  { key: 'STAR',        minMinutes: 630,  nextMinutes: 1080, color: 'from-yellow-500 to-yellow-600', textColor: 'text-yellow-400', borderColor: 'border-yellow-500/30', bgColor: 'bg-yellow-500/10', benefits: ['Priority booking (72h window)', '10% discount on all sessions', 'Star lounge access'] },
  { key: 'ALL-STAR',    minMinutes: 1080, nextMinutes: null, color: 'from-purple-500 to-purple-600', textColor: 'text-purple-400', borderColor: 'border-purple-500/30',  bgColor: 'bg-purple-500/10',  benefits: ['VIP booking (7-day window)', '20% discount', 'Free merch annually', 'Exclusive events'] },
] as const

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const { strava, error: queryError, athlete: athleteName } = await searchParams
  const session = await getCurrentUser()
  if (!session) redirect('/login')

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const [user, matchesForUser, topSports, sportRatings, stravaAccount, ninetyDayResult] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: session.id },
        include: {
          playerProfile: true,
          center: { select: { name: true, city: true } },
          userBadges: { include: { badge: true }, orderBy: { awardedAt: 'desc' } },
          _count: { select: { followers: true, following: true } },
        },
      }),
      prisma.matchResult.findMany({
        where: { participants: { some: { userId: session.id } }, status: 'CONFIRMED' },
        select: {
          winnerSide: true,
          participants: { where: { userId: session.id }, select: { role: true } },
        },
      }),
      prisma.activity.groupBy({
        by: ['type'],
        where: { userId: session.id, status: 'APPROVED' },
        _count: { type: true },
        orderBy: [{ _count: { type: 'desc' } }],
        take: 4,
      }),
      getSportRatings(session.id),
      prisma.oAuthAccount.findFirst({
        where: { userId: session.id, provider: 'strava' },
        select: { id: true },
      }),
      prisma.activity.aggregate({
        where: { userId: session.id, status: 'APPROVED', startedAt: { gte: ninetyDaysAgo } },
        _sum: { durationMinutes: true },
      }),
    ])

  if (!user) redirect('/login')

  const profile = user.playerProfile
  const level = profile?.level ?? Level.BRONZE
  const lifetimePoints = profile?.lifetimePoints ?? 0
  const xp = xpPercent(level, lifetimePoints)

  // Win rate
  const totalConfirmed = matchesForUser.length
  const wonCount = matchesForUser.filter(m => {
    const p = m.participants[0]
    if (!m.winnerSide || !p) return false
    return (m.winnerSide === 'HOME' && (p.role === 'HOME' || p.role === 'HOME_PARTNER')) ||
           (m.winnerSide === 'AWAY' && (p.role === 'AWAY' || p.role === 'AWAY_PARTNER'))
  }).length
  const winRate = totalConfirmed > 0 ? Math.round((wonCount / totalConfirmed) * 100) : 0

  // Loyalty tier
  const ninetyDayMinutes = ninetyDayResult._sum.durationMinutes ?? 0
  const currentTier = [...TIERS].reverse().find(t => ninetyDayMinutes >= t.minMinutes) ?? TIERS[0]
  const nextTier = TIERS.find(t => t.minMinutes > currentTier.minMinutes) ?? null
  const tierProgressPct = nextTier
    ? Math.min(100, Math.round(((ninetyDayMinutes - currentTier.minMinutes) / (nextTier.minMinutes! - currentTier.minMinutes)) * 100))
    : 100

  const nameInitials = initials(user.name)

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
          {/* Level badge */}
          <div className="absolute bottom-1 right-1 bg-primary-fixed-dim text-on-primary-fixed px-3 py-0.5 rounded-full text-label-caps border-2 border-surface-container-lowest flex items-center gap-1">
            <div className="w-2 h-2 bg-on-primary-fixed rounded-full pulse-green" />
            {LEVEL_LABEL[level]}
          </div>
        </div>

        {/* Name / bio */}
        <div className="space-y-xs">
          <h2 className="text-headline-lg text-on-surface">{user.name}</h2>
          <p className="text-body-md text-on-surface-variant max-w-xs mx-auto">
            {profile?.bio ?? `@${user.nickname} · ${user._count.followers} followers`}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-md w-full pt-md">
          <Link
            href="/app/settings"
            className="flex-1 bg-primary-fixed-dim text-on-primary font-bold text-label-caps py-3 rounded-xl action-glow active:scale-95 transition-all text-center"
          >
            EDIT PROFILE
          </Link>
          <Link
            href={`/app/profile`}
            aria-label="Share profile"
            className="flex items-center justify-center border-2 border-secondary-container text-secondary-container px-4 rounded-xl active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>share</span>
          </Link>
        </div>
      </section>

      {/* ── Stats Bento ──────────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-md">
        {/* Win Rate — big card */}
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
              <span className="text-headline-md text-on-surface">{profile?.eloRating ?? 1000}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── XP Progress ──────────────────────────────────────────── */}
      <div className="glass-card rounded-xl p-md">
        <div className="flex justify-between items-center mb-sm">
          <span className="text-label-caps text-on-surface-variant">Level Progress</span>
          <span className="text-label-caps text-primary-fixed">{xp}%</span>
        </div>
        <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-fixed-dim rounded-full transition-all"
            style={{ width: `${xp}%` }}
          />
        </div>
        <p className="text-label-caps text-on-surface-variant mt-xs">
          {lifetimePoints.toLocaleString()} / {LEVEL_NEXT[level].toLocaleString()} lifetime pts
        </p>
      </div>

      {/* ── Sports Played ────────────────────────────────────────── */}
      {topSports.length > 0 && (
        <section className="space-y-sm">
          <div className="flex justify-between items-center px-xs">
            <h3 className="text-label-caps text-on-surface-variant">Sports Played</h3>
          </div>
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
        <div className="flex justify-between items-center px-xs">
          <h3 className="text-label-caps text-on-surface-variant">Trophy Cabinet</h3>
          <Link href="/app/badges" className="text-label-caps text-primary-fixed hover:opacity-80">
            View All
          </Link>
        </div>
        {user.userBadges.length === 0 ? (
          <div className="glass-card rounded-xl p-md py-8 text-center text-on-surface-variant text-label-caps">
            Win matches to earn your first trophy!
          </div>
        ) : (
          <div className="glass-card rounded-xl p-md overflow-x-auto scrollbar-none">
            <div className="flex gap-lg min-w-max">
              {user.userBadges.slice(0, 10).map(ub => (
                <div key={ub.id} className="flex flex-col items-center gap-2 w-17.5">
                  <div className="w-14 h-14 rounded-full border-2 border-primary-fixed-dim flex items-center justify-center bg-primary-container/10">
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

      {/* ── Loyalty Tier ─────────────────────────────────────────── */}
      <section className={`glass-card rounded-xl p-md border-l-4 ${currentTier.borderColor.replace('border-', 'border-l-')}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-label-caps text-on-surface-variant mb-xs">Loyalty Tier</p>
            <p className={`text-headline-lg font-black ${currentTier.textColor}`}>{currentTier.key}</p>
            <p className="text-label-caps text-on-surface-variant mt-xs">
              {ninetyDayMinutes.toLocaleString()} min · last 90 days
            </p>
          </div>
          <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-linear-to-br ${currentTier.color} text-2xl shrink-0`}>
            {currentTier.key === 'MEMBER' ? '⭐' : currentTier.key === 'RISING STAR' ? '🌟' : currentTier.key === 'STAR' ? '💫' : '🏆'}
          </div>
        </div>

        {nextTier && (
          <div className="mt-md">
            <div className="flex justify-between text-label-caps text-on-surface-variant mb-xs">
              <span>{ninetyDayMinutes}m</span>
              <span>{nextTier.minMinutes}m to {nextTier.key}</span>
            </div>
            <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-linear-to-r ${currentTier.color} transition-all`}
                style={{ width: `${tierProgressPct}%` }}
              />
            </div>
          </div>
        )}

        <ul className="mt-md space-y-xs">
          {currentTier.benefits.map(b => (
            <li key={b} className="flex items-start gap-2 text-body-md text-on-surface-variant">
              <span className={`text-label-caps mt-0.5 ${currentTier.textColor}`}>✓</span>
              {b}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Connected Apps ───────────────────────────────────────── */}
      <StravaSection
        stravaAccountId={stravaAccount?.id ?? null}
        athleteName={strava === 'connected' && athleteName ? decodeURIComponent(athleteName) : null}
        justConnected={strava === 'connected'}
        connectError={queryError ? decodeURIComponent(queryError) : null}
      />
    </div>
  )
}
