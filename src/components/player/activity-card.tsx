import Link from 'next/link'
import { ActivityType } from '@/generated/prisma'
import {
  cn,
  formatDate,
  formatDuration,
  formatDistance,
  activityTypeLabel,
} from '@/lib/utils'

function activitySymbol(type: ActivityType): string {
  const map: Partial<Record<ActivityType, string>> = {
    PADEL: 'sports_tennis', TENNIS: 'sports_tennis', PICKLEBALL: 'sports_tennis',
    SQUASH: 'sports_handball', RACQUETBALL: 'sports_handball',
    BADMINTON: 'sports_badminton',
    RUN: 'directions_run', WALK: 'directions_walk',
    CYCLING: 'directions_bike',
    FOOTBALL_TRAINING: 'sports_soccer', FOOTBALL_MATCH: 'sports_soccer',
    FITNESS: 'fitness_center', CUSTOM: 'sports',
  }
  return map[type] ?? 'sports'
}

interface ActivityCardProps {
  activity: {
    id: string
    title: string
    type: ActivityType
    startedAt: Date | string
    durationMinutes: number
    distanceKm?: number | null
    pointsEarned: number
    user: {
      name: string
      nickname: string
      avatarUrl?: string | null
    }
  }
  compact?: boolean
  className?: string
}

export function ActivityCard({ activity, compact, className }: ActivityCardProps) {
  const label = activityTypeLabel(activity.type)

  return (
    <Link
      href={`/app/activities/${activity.id}`}
      className={cn(
        'group glass-card block rounded-xl p-4',
        'transition-all duration-200 hover:border-primary-fixed/30 hover:bg-surface-container-high hover:shadow-lg hover:shadow-black/20',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-fixed/10 transition-colors group-hover:bg-primary-fixed/20">
          <span
            className="material-symbols-outlined text-primary-fixed"
            style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}
          >
            {activitySymbol(activity.type)}
          </span>
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-on-surface leading-tight">
                {activity.title}
              </p>
              <p className="mt-0.5 text-xs text-on-surface-variant">{label}</p>
            </div>

            {/* Points badge */}
            <span className="shrink-0 rounded-full border border-[#FFD700]/20 bg-[#FFD700]/10 px-2.5 py-0.5 text-xs font-bold text-[#FFD700]">
              +{activity.pointsEarned} pts
            </span>
          </div>

          {/* Stats row */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {/* Date */}
            <span className="flex items-center gap-1 text-xs text-on-surface-variant">
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>event</span>
              {formatDate(activity.startedAt)}
            </span>

            {/* Duration */}
            <span className="flex items-center gap-1 text-xs text-on-surface">
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>timer</span>
              {formatDuration(activity.durationMinutes)}
            </span>

            {/* Distance (optional) */}
            {activity.distanceKm != null && activity.distanceKm > 0 && (
              <span className="flex items-center gap-1 text-xs text-on-surface">
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>straighten</span>
                {formatDistance(activity.distanceKm)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* User attribution */}
      <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
        <UserAvatar name={activity.user.name} avatarUrl={activity.user.avatarUrl} />
        <span className="truncate text-xs text-on-surface-variant">
          <span className="font-medium text-on-surface">{activity.user.name}</span>
          {' '}
          <span className="text-on-surface-variant">@{activity.user.nickname}</span>
        </span>
      </div>
    </Link>
  )
}

function UserAvatar({
  name,
  avatarUrl,
}: {
  name: string
  avatarUrl?: string | null
}) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-white/20"
      />
    )
  }

  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-fixed/20 text-[9px] font-bold text-primary-fixed ring-1 ring-primary-fixed/20">
      {initials}
    </span>
  )
}
