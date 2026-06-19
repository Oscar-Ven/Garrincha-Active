import { cn, formatDistance, formatDuration } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import type { LeaderboardEntry } from '@/types'

interface LeaderboardRowProps {
  entry: LeaderboardEntry
  rank: number
  isCurrentUser?: boolean
  metric?: 'points' | 'distance' | 'minutes'
}

const RANK_MEDAL: Record<number, { emoji: string; labelClass: string; rowAccent: string }> = {
  1: {
    emoji: '🥇',
    labelClass: 'text-yellow-400 font-black',
    rowAccent: 'border-yellow-500/40 bg-yellow-500/5',
  },
  2: {
    emoji: '🥈',
    labelClass: 'text-slate-300 font-black',
    rowAccent: 'border-slate-400/30 bg-slate-400/5',
  },
  3: {
    emoji: '🥉',
    labelClass: 'text-amber-700 font-black',
    rowAccent: 'border-amber-700/30 bg-amber-700/5',
  },
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatMetric(entry: LeaderboardEntry, metric: 'points' | 'distance' | 'minutes'): string {
  switch (metric) {
    case 'points':
      return `${entry.points.toLocaleString()} pts`
    case 'distance':
      return formatDistance(entry.distance)
    case 'minutes':
      return formatDuration(entry.minutes)
  }
}

export function LeaderboardRow({
  entry,
  rank,
  isCurrentUser = false,
  metric = 'points',
}: LeaderboardRowProps) {
  const medalConfig = RANK_MEDAL[rank]
  const isTopThree = rank <= 3

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors',
        isTopThree
          ? medalConfig.rowAccent
          : 'border-slate-700/50 bg-slate-800/40',
        isCurrentUser && [
          'border-green-500/60 bg-green-900/20',
          'ring-1 ring-green-500/30',
        ]
      )}
    >
      {/* Rank */}
      <div className="flex w-8 shrink-0 items-center justify-center">
        {isTopThree ? (
          <span className="text-xl leading-none" aria-label={`Rank ${rank}`}>
            {medalConfig.emoji}
          </span>
        ) : (
          <span
            className={cn(
              'text-sm font-semibold tabular-nums',
              isCurrentUser ? 'text-green-400' : 'text-slate-400'
            )}
          >
            {rank}
          </span>
        )}
      </div>

      {/* Avatar */}
      <Avatar size="sm" className="shrink-0">
        {entry.avatarUrl && (
          <AvatarImage src={entry.avatarUrl} alt={entry.name} />
        )}
        <AvatarFallback
          className={cn(
            isCurrentUser && 'bg-green-600',
            rank === 1 && 'bg-yellow-600',
            rank === 2 && 'bg-slate-500',
            rank === 3 && 'bg-amber-700'
          )}
        >
          {getInitials(entry.name)}
        </AvatarFallback>
      </Avatar>

      {/* Name + center */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              'truncate text-sm font-semibold leading-tight',
              isCurrentUser ? 'text-green-300' : 'text-white'
            )}
          >
            {entry.name}
          </span>
          {entry.nickname && (
            <span className="truncate text-xs text-slate-500">
              @{entry.nickname}
            </span>
          )}
          {isCurrentUser && (
            <span className="shrink-0 rounded bg-green-600/20 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-green-400">
              You
            </span>
          )}
        </div>
        {entry.centerName && (
          <p className="truncate text-xs text-slate-500 leading-tight mt-0.5">
            {entry.centerName}
          </p>
        )}
      </div>

      {/* Metric value */}
      <div className="shrink-0 text-right">
        <span
          className={cn(
            'text-sm font-bold tabular-nums',
            rank === 1 && 'text-yellow-400',
            rank === 2 && 'text-slate-300',
            rank === 3 && 'text-amber-600',
            rank > 3 && (isCurrentUser ? 'text-green-400' : 'text-slate-200')
          )}
        >
          {formatMetric(entry, metric)}
        </span>
      </div>
    </div>
  )
}
