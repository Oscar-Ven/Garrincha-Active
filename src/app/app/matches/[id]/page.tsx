import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getMatch } from '@/services/matches'
import { cn } from '@/lib/utils'
import { MatchConfirmPanel } from './confirm-panel'

export const metadata: Metadata = { title: 'Match Detail' }

function sportLabel(sport: string): string {
  return sport.replace(/_/g, ' ')
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('')
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
  const isConfirmed = match.status === 'CONFIRMED'
  const isPending = match.status === 'PENDING'

  const myParticipant = match.participants.find((p) => p.userId === user.id)
  const canConfirm = isPending && myParticipant && !myParticipant.confirmed
  const canDispute = isPending && !!myParticipant

  const playedAt = new Date(match.playedAt)

  return (
    <div className="max-w-xl mx-auto space-y-lg">
      {/* Back + title */}
      <div>
        <Link href="/app/matches" className="flex items-center gap-xs text-on-surface-variant hover:text-on-surface mb-sm">
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
          <span className="text-label-caps">My Matches</span>
        </Link>
        <div className="flex items-center gap-sm mb-xs">
          {isPending && (
            <span className="px-2 py-0.5 rounded-full text-label-caps bg-secondary/10 text-secondary border border-secondary/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary pulse-green" />
              Pending
            </span>
          )}
          {isConfirmed && (
            <span className="px-2 py-0.5 rounded-full text-label-caps bg-primary-fixed/10 text-primary-fixed border border-primary-fixed/30">
              Confirmed
            </span>
          )}
          {match.status === 'DISPUTED' && (
            <span className="px-2 py-0.5 rounded-full text-label-caps bg-error/10 text-error border border-error/30">
              Disputed
            </span>
          )}
          <span className="text-label-caps text-on-surface-variant">
            {match.format === 'DOUBLES' ? 'Doubles' : 'Singles'}
          </span>
        </div>
        <h1 className="text-display-lg-mobile font-black italic tracking-tighter text-primary-fixed leading-tight">
          {sportLabel(match.sport)}
        </h1>
      </div>

      {/* Teams display */}
      <section className="grid grid-cols-1 gap-md relative">
        {/* VS bubble */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center border-4 border-surface-container-lowest font-black text-on-primary-fixed italic text-sm">
            VS
          </div>
        </div>

        {/* Home */}
        <div className="glass-card rounded-xl p-md flex flex-col gap-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary-fixed" />
          <div className="flex justify-between items-center pl-sm">
            <span className="text-label-caps text-on-surface-variant">HOME</span>
            {isConfirmed && (
              <span className={cn('text-label-caps', match.winnerSide === 'HOME' ? 'text-primary-fixed' : 'text-on-surface-variant')}>
                {match.winnerSide === 'HOME' ? 'WINNER' : 'RUNNER UP'}
              </span>
            )}
          </div>
          <div className="flex gap-md pl-sm">
            {[home, homePartner].filter(Boolean).map(p => (
              <div key={p!.id} className="flex flex-col items-center gap-xs flex-1">
                <div className="w-16 h-16 rounded-full border-2 border-primary-fixed bg-surface-container-highest flex items-center justify-center font-bold text-white text-xl select-none">
                  {initials(p!.user.name)}
                </div>
                <span className="text-label-caps text-center">
                  {p!.user.nickname ?? p!.user.name.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
          <div className="text-center">
            <span className="text-stats-xl text-primary-fixed">{match.homeSetWins}</span>
          </div>
        </div>

        {/* Away */}
        <div className="glass-card rounded-xl p-md flex flex-col gap-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1 h-full bg-secondary-container" />
          <div className="flex justify-between items-center pr-sm">
            <span className="text-label-caps text-on-surface-variant">AWAY</span>
            {isConfirmed && (
              <span className={cn('text-label-caps', match.winnerSide === 'AWAY' ? 'text-secondary' : 'text-on-surface-variant')}>
                {match.winnerSide === 'AWAY' ? 'WINNER' : 'RUNNER UP'}
              </span>
            )}
          </div>
          <div className="flex gap-md">
            {[away, awayPartner].filter(Boolean).map(p => (
              <div key={p!.id} className="flex flex-col items-center gap-xs flex-1">
                <div className="w-16 h-16 rounded-full border-2 border-secondary bg-surface-container-highest flex items-center justify-center font-bold text-white text-xl select-none">
                  {initials(p!.user.name)}
                </div>
                <span className="text-label-caps text-center">
                  {p!.user.nickname ?? p!.user.name.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
          <div className="text-center">
            <span className="text-stats-xl text-secondary">{match.awaySetWins}</span>
          </div>
        </div>
      </section>

      {/* Set breakdown */}
      {match.sets.length > 0 && (
        <section className="glass-card rounded-xl p-md">
          <p className="text-label-caps text-on-surface-variant mb-md">Set Breakdown</p>
          <div className="space-y-sm">
            {match.sets.map(s => (
              <div key={s.id} className="grid grid-cols-3 items-center text-center">
                <span className={cn('text-headline-md font-black', s.homeGames > s.awayGames ? 'text-primary-fixed' : 'text-on-surface-variant')}>
                  {s.homeGames}{s.homeTiebreak != null && <sup className="text-xs">({s.homeTiebreak})</sup>}
                </span>
                <span className="text-label-caps text-on-surface-variant">Set {s.setNumber}</span>
                <span className={cn('text-headline-md font-black', s.awayGames > s.homeGames ? 'text-secondary' : 'text-on-surface-variant')}>
                  {s.awayGames}{s.awayTiebreak != null && <sup className="text-xs">({s.awayTiebreak})</sup>}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Match info bento */}
      <section className="grid grid-cols-2 gap-md">
        <div className="glass-card rounded-xl p-md space-y-xs">
          <span className="material-symbols-outlined text-primary-fixed" style={{ fontSize: '18px' }}>
            calendar_today
          </span>
          <p className="text-label-caps text-on-surface-variant">Date</p>
          <p className="text-headline-md text-on-surface leading-tight">
            {playedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </p>
          <p className="text-label-caps text-on-surface-variant">
            {playedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="glass-card rounded-xl p-md space-y-xs">
          <span className="material-symbols-outlined text-primary-fixed" style={{ fontSize: '18px' }}>
            sports_score
          </span>
          <p className="text-label-caps text-on-surface-variant">Surface</p>
          <p className="text-headline-md text-on-surface leading-tight capitalize">
            {match.surface?.toLowerCase() ?? '—'}
          </p>
          {match.court && (
            <p className="text-label-caps text-on-surface-variant">{match.court.name}</p>
          )}
        </div>
      </section>

      {/* Notes */}
      {match.notes && (
        <div className="glass-card rounded-xl p-md border-l-4 border-l-outline-variant">
          <p className="text-label-caps text-on-surface-variant mb-xs">Notes</p>
          <p className="text-body-md text-on-surface">{match.notes}</p>
        </div>
      )}

      {/* Confirmations */}
      <div className="glass-card rounded-xl p-md space-y-sm">
        <p className="text-label-caps text-on-surface-variant">Confirmations</p>
        {match.participants.map(p => (
          <div key={p.id} className="flex items-center justify-between">
            <span className="text-body-md text-on-surface">{p.user.nickname ?? p.user.name}</span>
            {p.disputed ? (
              <span className="text-label-caps text-error flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>flag</span>
                Disputed
              </span>
            ) : p.confirmed ? (
              <span className="text-label-caps text-primary-fixed flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Confirmed
              </span>
            ) : (
              <span className="text-label-caps text-secondary flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>schedule</span>
                Pending
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Result banner */}
      {isConfirmed && (
        <div className={cn(
          'glass-card rounded-xl p-md text-center border-l-4',
          isWinner ? 'border-l-primary-fixed' : 'border-l-error',
        )}>
          <span
            className="material-symbols-outlined block mb-xs"
            style={{ fontSize: '32px', fontVariationSettings: "'FILL' 1", color: isWinner ? '#c3f400' : '#ffb4ab' }}
          >
            {isWinner ? 'emoji_events' : 'sentiment_neutral'}
          </span>
          <p className={cn('text-headline-md font-bold', isWinner ? 'text-primary-fixed' : 'text-error')}>
            {isWinner ? 'You Won!' : 'Good effort!'}
          </p>
          <p className="text-label-caps text-on-surface-variant mt-xs">
            {isWinner ? 'ELO updated · well played.' : 'Keep going — every match counts.'}
          </p>
        </div>
      )}

      {/* Confirm / Dispute panel */}
      {(canConfirm || canDispute) && (
        <MatchConfirmPanel matchId={id} canConfirm={!!canConfirm} canDispute={!!canDispute} />
      )}
    </div>
  )
}
