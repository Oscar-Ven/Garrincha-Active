import { cn, formatDistance, formatDuration } from '@/lib/utils'
import type { LeaderboardEntry } from '@/types'

const MEDAL_ICON: Record<number, string> = { 1: 'emoji_events', 2: 'workspace_premium', 3: 'military_tech' }
const MEDAL_COLOR: Record<number, string> = { 1: 'text-[#FFD700]', 2: 'text-[#C0C0C0]', 3: 'text-[#CD7F32]' }
const MEDAL_AVATAR: Record<number, string> = { 1: 'border-[#FFD700]', 2: 'border-[#C0C0C0]', 3: 'border-[#CD7F32]' }

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join('')
}

function formatMetric(entry: LeaderboardEntry, metric: 'points' | 'distance' | 'minutes'): string {
  switch (metric) {
    case 'points':   return `${entry.points.toLocaleString()} pts`
    case 'distance': return formatDistance(entry.distance)
    case 'minutes':  return formatDuration(entry.minutes)
  }
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry
  rank: number
  isCurrentUser?: boolean
  metric?: 'points' | 'distance' | 'minutes'
}

export function LeaderboardRow({ entry, rank, isCurrentUser = false, metric = 'points' }: LeaderboardRowProps) {
  const isTopThree = rank <= 3

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl px-md py-sm border transition-colors',
        isCurrentUser
          ? 'border-primary-fixed/40 bg-primary-fixed/5'
          : isTopThree
          ? 'border-white/10 bg-surface-container-high'
          : 'border-transparent hover:bg-surface-container',
      )}
    >
      {/* Rank */}
      <div className="w-8 shrink-0 flex items-center justify-center">
        {isTopThree ? (
          <span
            className={cn('material-symbols-outlined', MEDAL_COLOR[rank])}
            style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}
          >
            {MEDAL_ICON[rank]}
          </span>
        ) : (
          <span className={cn('text-label-caps tabular-nums', isCurrentUser ? 'text-primary-fixed' : 'text-on-surface-variant')}>
            {rank}
          </span>
        )}
      </div>

      {/* Avatar */}
      <div
        className={cn(
          'w-9 h-9 rounded-full border-2 bg-surface-container-highest flex items-center justify-center font-bold text-white text-sm shrink-0 select-none',
          isCurrentUser ? 'border-primary-fixed' : isTopThree ? MEDAL_AVATAR[rank] : 'border-white/20',
        )}
      >
        {initials(entry.name)}
      </div>

      {/* Name + center */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className={cn('text-body-md font-bold truncate', isCurrentUser ? 'text-primary-fixed' : 'text-white')}>
            {entry.name}
          </span>
          {entry.nickname && (
            <span className="text-on-surface-variant text-xs truncate">@{entry.nickname}</span>
          )}
          {isCurrentUser && (
            <span className="shrink-0 rounded bg-primary-fixed/10 px-1.5 py-px text-label-caps text-primary-fixed">You</span>
          )}
        </div>
        {entry.centerName && (
          <p className="text-label-caps text-on-surface-variant truncate">{entry.centerName}</p>
        )}
      </div>

      {/* Value */}
      <div className="shrink-0 text-right">
        <span className={cn(
          'text-body-md font-bold tabular-nums',
          rank === 1 ? 'text-[#FFD700]' : rank === 2 ? 'text-[#C0C0C0]' : rank === 3 ? 'text-[#CD7F32]' : isCurrentUser ? 'text-primary-fixed' : 'text-on-surface',
        )}>
          {formatMetric(entry, metric)}
        </span>
      </div>
    </div>
  )
}
