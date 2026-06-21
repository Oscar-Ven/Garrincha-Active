import Link from 'next/link'
import { MatchFull } from '@/services/matches'
import { cn } from '@/lib/utils'

function sportIcon(sport: string): string {
  const m: Record<string, string> = {
    TENNIS: 'sports_tennis', PADEL: 'sports_tennis',
    SQUASH: 'sports_handball', BADMINTON: 'sports_badminton',
    PICKLEBALL: 'sports_tennis', RACQUETBALL: 'sports_handball',
  }
  return m[sport] ?? 'sports'
}

function sportLabel(sport: string): string {
  return sport.replace(/_/g, ' ').split(' ').map(w => w[0] + w.slice(1).toLowerCase()).join(' ')
}

interface MatchCardProps {
  match: MatchFull
  currentUserId: string
}

export function MatchCard({ match, currentUserId }: MatchCardProps) {
  const home = match.participants.find((p) => p.role === 'HOME')
  const away = match.participants.find((p) => p.role === 'AWAY')
  const homePartner = match.participants.find((p) => p.role === 'HOME_PARTNER')
  const awayPartner = match.participants.find((p) => p.role === 'AWAY_PARTNER')

  const isHomeSide = currentUserId === home?.userId || currentUserId === homePartner?.userId
  const isWinner = match.status === 'CONFIRMED' && match.winnerSide === (isHomeSide ? 'HOME' : 'AWAY')
  const isConfirmed = match.status === 'CONFIRMED'
  const isPending = match.status === 'PENDING'
  const isDisputed = match.status === 'DISPUTED'

  const borderColor = isConfirmed
    ? isWinner ? 'border-l-primary-fixed' : 'border-l-error'
    : isPending ? 'border-l-secondary'
    : isDisputed ? 'border-l-error'
    : 'border-l-outline-variant'

  const statusColor = isConfirmed
    ? isWinner ? 'text-primary-fixed' : 'text-error'
    : isPending ? 'text-secondary'
    : isDisputed ? 'text-error'
    : 'text-on-surface-variant'

  const statusLabel = isConfirmed
    ? isWinner ? 'Won' : 'Lost'
    : isPending ? 'Pending'
    : match.status.charAt(0) + match.status.slice(1).toLowerCase()

  const homeName = home?.user.nickname ?? home?.user.name ?? '?'
  const awayName = away?.user.nickname ?? away?.user.name ?? '?'
  const homePartnerName = homePartner ? (homePartner.user.nickname ?? homePartner.user.name) : null
  const awayPartnerName = awayPartner ? (awayPartner.user.nickname ?? awayPartner.user.name) : null

  const playedAt = new Date(match.playedAt)
  const dateStr = playedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  return (
    <Link
      href={`/app/matches/${match.id}`}
      className={cn(
        'glass-card rounded-xl p-md flex flex-col gap-sm border-l-4 hover:bg-surface-container-high transition-colors active:scale-[0.99]',
        borderColor,
      )}
    >
      {/* Top row: sport + status + date */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-primary-fixed-dim"
            style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
          >
            {sportIcon(match.sport)}
          </span>
          <span className="text-label-caps text-on-surface">
            {sportLabel(match.sport)} {match.format === 'DOUBLES' ? 'Doubles' : 'Singles'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-label-caps', statusColor)}>{statusLabel}</span>
          <span className="text-label-caps text-on-surface-variant">{dateStr}</span>
        </div>
      </div>

      {/* Players vs + score */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-body-md font-bold text-white truncate">
            {homeName}{homePartnerName ? ` / ${homePartnerName}` : ''}
          </p>
          <p className="text-label-caps text-on-surface-variant">
            vs {awayName}{awayPartnerName ? ` / ${awayPartnerName}` : ''}
          </p>
        </div>
        <div className="text-headline-md font-black text-on-surface shrink-0">
          {match.homeSetWins}<span className="text-on-surface-variant mx-1">-</span>{match.awaySetWins}
        </div>
      </div>

      {/* Pending indicator */}
      {isPending && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-secondary pulse-green" />
          <span className="text-label-caps text-secondary">Awaiting confirmation</span>
        </div>
      )}
    </Link>
  )
}
