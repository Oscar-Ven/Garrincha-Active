import Image from 'next/image'
import { cn, formatDistance, formatDuration, getLevelColor } from '@/lib/utils'
import { Level } from '@/generated/prisma'

interface BadgeProp {
  id: string
  name: string
  iconUrl?: string | null
  description?: string | null
}

interface PlayerProfileCardProps {
  user: {
    name: string
    nickname: string
    avatarUrl?: string | null
    center?: { name: string } | null
  }
  profile: {
    totalPoints: number
    lifetimePoints: number
    level: Level
    totalDistance: number
    totalMinutes: number
    totalActivities: number
  }
  badges: BadgeProp[]
  followersCount: number
  followingCount: number
  className?: string
}

const LEVEL_CONFIG: Record<
  Level,
  { label: string; bg: string; text: string; border: string; ring: string }
> = {
  [Level.BRONZE]: {
    label: 'Bronze',
    bg: 'bg-amber-900/30',
    text: 'text-amber-600',
    border: 'border-amber-700/60',
    ring: 'ring-amber-700/50',
  },
  [Level.SILVER]: {
    label: 'Silver',
    bg: 'bg-slate-700/40',
    text: 'text-slate-300',
    border: 'border-slate-500/60',
    ring: 'ring-slate-500/50',
  },
  [Level.GOLD]: {
    label: 'Gold',
    bg: 'bg-yellow-900/30',
    text: 'text-yellow-500',
    border: 'border-yellow-600/60',
    ring: 'ring-yellow-600/50',
  },
  [Level.ELITE]: {
    label: 'Elite',
    bg: 'bg-emerald-900/30',
    text: 'text-emerald-400',
    border: 'border-emerald-500/60',
    ring: 'ring-emerald-500/50',
  },
}

function LevelBadge({ level }: { level: Level }) {
  const cfg = LEVEL_CONFIG[level]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-widest',
        cfg.bg,
        cfg.text,
        cfg.border
      )}
    >
      <LevelIcon level={level} className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}

function LevelIcon({ level, className }: { level: Level; className?: string }) {
  if (level === Level.ELITE) {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 1l1.545 4.754H15l-4.045 2.939 1.545 4.754L8 10.508l-4.5 2.939 1.545-4.754L1 5.754h5.455z" />
      </svg>
    )
  }
  if (level === Level.GOLD) {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <circle cx="8" cy="8" r="6" />
      </svg>
    )
  }
  if (level === Level.SILVER) {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <circle cx="8" cy="8" r="5" />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="8" cy="8" r="4" />
    </svg>
  )
}

function LevelRingColor(level: Level): string {
  return LEVEL_CONFIG[level].ring
}

function AvatarDisplay({
  avatarUrl,
  name,
  level,
}: {
  avatarUrl?: string | null
  name: string
  level: Level
}) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const ringClass = LevelRingColor(level)

  return (
    <div className={cn('relative inline-block rounded-full ring-4 ring-offset-4 ring-offset-slate-900', ringClass)}>
      <div className="relative h-24 w-24 overflow-hidden rounded-full bg-slate-700 sm:h-28 sm:w-28">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={name}
            fill
            sizes="112px"
            className="object-cover"
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-green-700 to-green-900 text-2xl font-bold text-white sm:text-3xl">
            {initials}
          </div>
        )}
      </div>
      {/* Level badge overlay */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
        <span
          className={cn(
            'inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap shadow-lg',
            LEVEL_CONFIG[level].bg,
            LEVEL_CONFIG[level].text,
            LEVEL_CONFIG[level].border
          )}
        >
          <LevelIcon level={level} className="h-2.5 w-2.5" />
          {LEVEL_CONFIG[level].label}
        </span>
      </div>
    </div>
  )
}

function StatItem({
  label,
  value,
  icon,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1 text-slate-400">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-lg font-bold text-white tabular-nums leading-none">{value}</span>
    </div>
  )
}

function SocialCount({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-base font-bold text-white tabular-nums leading-none">
        {count.toLocaleString()}
      </span>
      <span className="text-xs text-slate-400 font-medium">{label}</span>
    </div>
  )
}

function BadgeIcon({ badge }: { badge: BadgeProp }) {
  const initials = badge.name.slice(0, 2).toUpperCase()
  return (
    <div
      title={badge.name}
      className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-yellow-600/40 bg-yellow-900/20 text-yellow-500 shadow-sm"
    >
      {badge.iconUrl ? (
        <Image
          src={badge.iconUrl}
          alt={badge.name}
          fill
          sizes="40px"
          className="object-cover"
        />
      ) : (
        <span className="text-[10px] font-bold">{initials}</span>
      )}
    </div>
  )
}

export function PlayerProfileCard({
  user,
  profile,
  badges,
  followersCount,
  followingCount,
  className,
}: PlayerProfileCardProps) {
  const visibleBadges = badges.slice(0, 5)
  const extraBadges = badges.length - visibleBadges.length

  const formattedPoints = profile.totalPoints.toLocaleString()
  const formattedDistance = formatDistance(profile.totalDistance)
  const formattedDuration = formatDuration(profile.totalMinutes)

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/80 shadow-xl backdrop-blur-sm',
        className
      )}
    >
      {/* Decorative gradient header strip */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-green-900/60 via-slate-800/40 to-slate-900/60" />

      <div className="relative px-6 pb-6 pt-8">
        {/* Top row: avatar + social counts */}
        <div className="flex items-end justify-between gap-4">
          <AvatarDisplay
            avatarUrl={user.avatarUrl}
            name={user.name}
            level={profile.level}
          />

          <div className="flex items-center gap-6 pb-1">
            <SocialCount label="Followers" count={followersCount} />
            <div className="h-8 w-px bg-slate-700" />
            <SocialCount label="Following" count={followingCount} />
          </div>
        </div>

        {/* Identity */}
        <div className="mt-5 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-white leading-none">{user.name}</h2>
            <LevelBadge level={profile.level} />
          </div>
          <p className="text-sm font-medium text-green-400">@{user.nickname}</p>
          {user.center && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <svg
                className="h-3.5 w-3.5 flex-shrink-0 text-slate-400"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-xs text-slate-400">{user.center.name}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="my-5 border-t border-slate-700/60" />

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <StatItem
            label="Points"
            value={formattedPoints}
            icon={
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            }
          />
          <StatItem
            label="Distance"
            value={formattedDistance}
            icon={
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
            }
          />
          <StatItem
            label="Time"
            value={formattedDuration}
            icon={
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
            }
          />
        </div>

        {/* Activity count */}
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-slate-700/50 bg-slate-900/40 px-4 py-2.5">
          <svg
            className="h-4 w-4 text-green-500"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm text-slate-300">
            <span className="font-bold text-white">{profile.totalActivities.toLocaleString()}</span>
            {' '}
            {profile.totalActivities === 1 ? 'activity' : 'activities'} logged
          </span>
        </div>

        {/* Lifetime points footnote */}
        <p className="mt-1.5 text-center text-xs text-slate-500">
          {profile.lifetimePoints.toLocaleString()} lifetime points
        </p>

        {/* Badges section */}
        {badges.length > 0 && (
          <>
            <div className="my-5 border-t border-slate-700/60" />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Badges
                </span>
                <span className="text-xs text-slate-500">{badges.length} earned</span>
              </div>
              <div className="flex items-center gap-2">
                {visibleBadges.map((badge) => (
                  <BadgeIcon key={badge.id} badge={badge} />
                ))}
                {extraBadges > 0 && (
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-slate-600 bg-slate-700/60 text-xs font-bold text-slate-300">
                    +{extraBadges}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
