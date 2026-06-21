import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getMatch } from '@/services/matches'
import { activityTypeLabel, activityTypeIcon, cn } from '@/lib/utils'
import { MatchConfirmPanel } from './confirm-panel'

export const metadata: Metadata = { title: 'Match Detail' }

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-900/30 text-yellow-300 border-yellow-700/50',
  CONFIRMED: 'bg-green-900/30 text-green-300 border-green-700/50',
  DISPUTED: 'bg-red-900/30 text-red-300 border-red-700/50',
  CANCELLED: 'bg-slate-800/60 text-slate-400 border-slate-700/50',
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { id } = await params
  const match = await getMatch(id)
  if (!match) notFound()

  const isParticipant = match.participants.some((p) => p.userId === user.id)
  if (!isParticipant) notFound()

  const home = match.participants.find((p) => p.role === 'HOME')
  const away = match.participants.find((p) => p.role === 'AWAY')
  const homePartner = match.participants.find((p) => p.role === 'HOME_PARTNER')
  const awayPartner = match.participants.find((p) => p.role === 'AWAY_PARTNER')

  const isHomeSide = user.id === home?.userId || user.id === homePartner?.userId
  const isWinner = match.status === 'CONFIRMED' && match.winnerSide === (isHomeSide ? 'HOME' : 'AWAY')

  const icon = activityTypeIcon(match.sport as never)
  const label = activityTypeLabel(match.sport as never)
  const formatLabel = match.format === 'DOUBLES' ? 'Doubles' : 'Singles'
  const playedAt = new Date(match.playedAt)

  const myParticipant = match.participants.find((p) => p.userId === user.id)
  const canConfirm = match.status === 'PENDING' && myParticipant && !myParticipant.confirmed
  const canDispute = match.status === 'PENDING' && myParticipant

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-2xl font-bold text-white">
            <span>{icon}</span>
            <span>{label} {formatLabel}</span>
          </div>
          <p className="text-white/40 text-sm mt-1">
            {playedAt.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
            {match.court && <> · {match.court.name}</>}
          </p>
        </div>
        <span className={cn(
          'shrink-0 text-xs px-2.5 py-1 rounded-full border font-medium',
          STATUS_BADGE[match.status] ?? STATUS_BADGE.CANCELLED,
        )}>
          {match.status.charAt(0) + match.status.slice(1).toLowerCase()}
        </span>
      </div>

      {/* Score */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="grid grid-cols-3 items-center gap-4 text-center">
          {/* Home */}
          <div className="space-y-1">
            <p className="text-white font-semibold truncate">
              {home?.user.nickname ?? home?.user.name}
              {homePartner && (
                <><br /><span className="text-white/50 text-xs">{homePartner.user.nickname ?? homePartner.user.name}</span></>
              )}
            </p>
            {match.status === 'CONFIRMED' && (
              <span className={cn('text-xs font-medium', match.winnerSide === 'HOME' ? 'text-green-400' : 'text-red-400')}>
                {match.winnerSide === 'HOME' ? 'Winner' : 'Runner-up'}
              </span>
            )}
          </div>

          {/* Score */}
          <div className="text-3xl font-bold text-white font-mono">
            {match.homeSetWins}
            <span className="text-white/30 mx-1">-</span>
            {match.awaySetWins}
          </div>

          {/* Away */}
          <div className="space-y-1">
            <p className="text-white font-semibold truncate">
              {away?.user.nickname ?? away?.user.name}
              {awayPartner && (
                <><br /><span className="text-white/50 text-xs">{awayPartner.user.nickname ?? awayPartner.user.name}</span></>
              )}
            </p>
            {match.status === 'CONFIRMED' && (
              <span className={cn('text-xs font-medium', match.winnerSide === 'AWAY' ? 'text-green-400' : 'text-red-400')}>
                {match.winnerSide === 'AWAY' ? 'Winner' : 'Runner-up'}
              </span>
            )}
          </div>
        </div>

        {/* Set breakdown */}
        {match.sets.length > 0 && (
          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="space-y-1.5">
              {match.sets.map((s) => (
                <div key={s.id} className="grid grid-cols-3 text-sm text-center">
                  <span className={cn('font-mono font-medium', s.homeGames > s.awayGames ? 'text-white' : 'text-white/40')}>
                    {s.homeGames}{s.homeTiebreak != null && <sup className="text-xs text-white/40">({s.homeTiebreak})</sup>}
                  </span>
                  <span className="text-white/30 text-xs">Set {s.setNumber}</span>
                  <span className={cn('font-mono font-medium', s.awayGames > s.homeGames ? 'text-white' : 'text-white/40')}>
                    {s.awayGames}{s.awayTiebreak != null && <sup className="text-xs text-white/40">({s.awayTiebreak})</sup>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      {match.notes && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-white/50 text-xs mb-1">Notes</p>
          <p className="text-white/80 text-sm">{match.notes}</p>
        </div>
      )}

      {/* Confirmations */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
        <p className="text-white/50 text-xs font-medium uppercase tracking-wide">Confirmations</p>
        {match.participants.map((p) => (
          <div key={p.id} className="flex items-center justify-between text-sm">
            <span className="text-white/70">{p.user.nickname ?? p.user.name}</span>
            {p.disputed ? (
              <span className="text-red-400 text-xs">Disputed</span>
            ) : p.confirmed ? (
              <span className="text-green-400 text-xs">Confirmed</span>
            ) : (
              <span className="text-yellow-400 text-xs">Pending</span>
            )}
          </div>
        ))}
      </div>

      {/* My result banner */}
      {match.status === 'CONFIRMED' && (
        <div className={cn(
          'rounded-xl border p-4 text-center',
          isWinner
            ? 'border-green-700/50 bg-green-900/20 text-green-300'
            : 'border-red-700/50 bg-red-900/20 text-red-300',
        )}>
          <p className="font-semibold">{isWinner ? 'You won!' : 'Good effort!'}</p>
          <p className="text-xs opacity-70 mt-0.5">
            {isWinner ? 'Rating updated — well played.' : 'Keep going — every match counts.'}
          </p>
        </div>
      )}

      {/* Confirm / Dispute panel (client component) */}
      {(canConfirm || canDispute) && (
        <MatchConfirmPanel matchId={id} canConfirm={!!canConfirm} canDispute={!!canDispute} />
      )}
    </div>
  )
}
