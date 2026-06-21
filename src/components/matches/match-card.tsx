import Link from 'next/link'
import { MatchFull } from '@/services/matches'
import { activityTypeIcon, activityTypeLabel, cn } from '@/lib/utils'

interface MatchCardProps {
  match: MatchFull
  currentUserId: string
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-900/30 text-yellow-300 border-yellow-700/50',
  CONFIRMED: 'bg-green-900/30 text-green-300 border-green-700/50',
  DISPUTED: 'bg-red-900/30 text-red-300 border-red-700/50',
  CANCELLED: 'bg-slate-800/60 text-slate-400 border-slate-700/50',
}

export function MatchCard({ match, currentUserId }: MatchCardProps) {
  const home = match.participants.find((p) => p.role === 'HOME')
  const away = match.participants.find((p) => p.role === 'AWAY')
  const homePartner = match.participants.find((p) => p.role === 'HOME_PARTNER')
  const awayPartner = match.participants.find((p) => p.role === 'AWAY_PARTNER')

  const isHomeSide = currentUserId === home?.userId || currentUserId === homePartner?.userId
  const isWinner = match.winnerSide === (isHomeSide ? 'HOME' : 'AWAY')
  const resultLabel = match.status === 'CONFIRMED' ? (isWinner ? 'W' : 'L') : null

  const score = `${match.homeSetWins}-${match.awaySetWins}`
  const icon = activityTypeIcon(match.sport as never)
  const label = activityTypeLabel(match.sport as never)
  const formatLabel = match.format === 'DOUBLES' ? 'Doubles' : 'Singles'
  const playedAt = new Date(match.playedAt)

  return (
    <Link
      href={`/app/matches/${match.id}`}
      className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl shrink-0">{icon}</span>
          <div className="min-w-0">
            <div className="font-semibold text-white text-sm">
              {label} {formatLabel}
            </div>
            <div className="text-xs text-white/50 mt-0.5">
              {playedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              {match.court && <> · {match.court.name}</>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {resultLabel && (
            <span className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
              isWinner ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400',
            )}>
              {resultLabel}
            </span>
          )}
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full border font-medium',
            STATUS_STYLES[match.status] ?? STATUS_STYLES.CANCELLED,
          )}>
            {match.status.charAt(0) + match.status.slice(1).toLowerCase()}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <div className="text-white/70 truncate">
          {home?.user.nickname ?? home?.user.name}
          {homePartner && ` / ${homePartner.user.nickname ?? homePartner.user.name}`}
          <span className="text-white/40 mx-1">vs</span>
          {away?.user.nickname ?? away?.user.name}
          {awayPartner && ` / ${awayPartner.user.nickname ?? awayPartner.user.name}`}
        </div>
        <div className="font-mono font-semibold text-white shrink-0 ml-2">{score}</div>
      </div>
    </Link>
  )
}
