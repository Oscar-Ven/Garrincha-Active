import Link from 'next/link'
import { ActivityType } from '@/generated/prisma'
import {
  cn,
  formatDate,
  formatDuration,
  formatDistance,
  activityTypeIcon,
  activityTypeLabel,
} from '@/lib/utils'

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
  const icon = activityTypeIcon(activity.type)
  const label = activityTypeLabel(activity.type)

  return (
    <Link
      href={`/app/activities/${activity.id}`}
      className={cn(
        'group block rounded-xl border border-slate-700 bg-slate-800 p-4',
        'transition-all duration-200 hover:border-green-600 hover:bg-slate-750 hover:shadow-lg hover:shadow-green-900/20',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-700 text-2xl transition-colors group-hover:bg-slate-600">
          {icon}
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white leading-tight">
                {activity.title}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">{label}</p>
            </div>

            {/* Points badge */}
            <span className="shrink-0 rounded-full bg-yellow-600/20 px-2.5 py-0.5 text-xs font-bold text-yellow-500 ring-1 ring-yellow-600/30">
              +{activity.pointsEarned} pts
            </span>
          </div>

          {/* Stats row */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {/* Date */}
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <CalendarIcon />
              {formatDate(activity.startedAt)}
            </span>

            {/* Duration */}
            <span className="flex items-center gap-1 text-xs text-slate-300">
              <ClockIcon />
              {formatDuration(activity.durationMinutes)}
            </span>

            {/* Distance (optional) */}
            {activity.distanceKm != null && activity.distanceKm > 0 && (
              <span className="flex items-center gap-1 text-xs text-slate-300">
                <RouteIcon />
                {formatDistance(activity.distanceKm)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* User attribution */}
      <div className="mt-3 flex items-center gap-2 border-t border-slate-700/60 pt-3">
        <UserAvatar name={activity.user.name} avatarUrl={activity.user.avatarUrl} />
        <span className="truncate text-xs text-slate-400">
          <span className="font-medium text-slate-300">{activity.user.name}</span>
          {' '}
          <span className="text-slate-500">@{activity.user.nickname}</span>
        </span>
      </div>
    </Link>
  )
}

// ---- Small inline icon components (no extra deps) ----

function CalendarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M4 1.75a.75.75 0 0 1 1.5 0V3h5V1.75a.75.75 0 0 1 1.5 0V3A2.5 2.5 0 0 1 14.5 5.5v6A2.5 2.5 0 0 1 12 14H4a2.5 2.5 0 0 1-2.5-2.5v-6A2.5 2.5 0 0 1 4 3V1.75ZM3 7h10v4.5A1 1 0 0 1 12 12.5H4A1 1 0 0 1 3 11.5V7Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-3.25a.75.75 0 0 1 .75.75v2.69l1.28 1.28a.75.75 0 1 1-1.06 1.06l-1.5-1.5A.75.75 0 0 1 7.25 8.5V5.5A.75.75 0 0 1 8 4.75Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function RouteIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M8 1a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM4 3.5a4 4 0 1 1 5.435 3.745L8.16 10h1.59a1.75 1.75 0 1 1 0 1.5H8a.75.75 0 0 1-.75-.75V7.604A4.001 4.001 0 0 1 4 3.5Z" />
    </svg>
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
        className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-slate-600"
      />
    )
  }

  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-700 text-[9px] font-bold text-white ring-1 ring-green-600">
      {initials}
    </span>
  )
}
