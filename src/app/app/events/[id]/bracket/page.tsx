'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { roundLabel } from '@/lib/bracket'

interface Player { id: string; name: string; nickname?: string; avatarUrl?: string | null }
interface Match {
  id: string
  round: number
  matchIndex: number
  homeUserId: string | null
  awayUserId: string | null
  homeScore: number | null
  awayScore: number | null
  winnerId: string | null
  status: string
  homeUser: Player | null
  awayUser: Player | null
}
interface Event { id: string; title: string }

function PlayerSlot({ player, isWinner, score }: { player: Player | null; isWinner: boolean; score: number | null }) {
  if (!player) return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div className="h-6 w-6 rounded-full bg-slate-700" />
      <span className="text-xs text-slate-600 italic">TBD</span>
    </div>
  )
  return (
    <div className={cn('flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition-colors', isWinner && 'bg-green-600/10')}>
      <div className="flex items-center gap-2 min-w-0">
        {player.avatarUrl
          ? <img src={player.avatarUrl} alt={player.name} className="h-6 w-6 rounded-full object-cover" />
          : <div className="h-6 w-6 rounded-full bg-slate-600 flex items-center justify-center text-xs text-white">{player.name[0]}</div>
        }
        <span className={cn('text-sm truncate', isWinner ? 'font-bold text-white' : 'text-slate-300')}>{player.name}</span>
      </div>
      {score != null && (
        <span className={cn('text-sm font-bold shrink-0', isWinner ? 'text-green-400' : 'text-slate-500')}>{score}</span>
      )}
    </div>
  )
}

function MatchCard({ match }: { match: Match }) {
  const homeWon = match.winnerId === match.homeUserId && match.status === 'COMPLETED'
  const awayWon = match.winnerId === match.awayUserId && match.status === 'COMPLETED'
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 overflow-hidden min-w-[180px] w-[180px]">
      <PlayerSlot player={match.homeUser} isWinner={homeWon} score={match.homeScore} />
      <div className="border-t border-slate-700/60" />
      <PlayerSlot player={match.awayUser} isWinner={awayWon} score={match.awayScore} />
    </div>
  )
}

export default function BracketPage() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/events/${id}/bracket`)
      .then((r) => r.json())
      .then((d) => { setEvent(d.event); setMatches(d.matches ?? []) })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
    </div>
  )

  if (matches.length === 0) return (
    <div className="mx-auto max-w-lg px-4 py-10 text-center space-y-4">
      <div className="text-4xl">🏆</div>
      <h1 className="text-xl font-bold text-white">{event?.title}</h1>
      <p className="text-slate-400">Bracket hasn&apos;t been seeded yet. The organiser will generate it once registrations close.</p>
      <Link href={`/app/events/${id}`} className="inline-block text-sm text-slate-400 hover:text-white transition-colors">← Back to event</Link>
    </div>
  )

  const maxRound = Math.max(...matches.map((m) => m.round))
  const rounds = Array.from({ length: maxRound }, (_, i) => i + 1)

  return (
    <div className="px-4 pb-12 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/app/events/${id}`} className="text-slate-400 hover:text-slate-200 transition-colors">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">{event?.title} — Bracket</h1>
          <p className="text-sm text-slate-400">Single elimination · {maxRound} round{maxRound !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Horizontal scrollable bracket */}
      <div className="overflow-x-auto">
        <div className="flex gap-8 pb-4" style={{ minWidth: `${rounds.length * 220}px` }}>
          {rounds.map((r) => {
            const roundMatches = matches.filter((m) => m.round === r)
            return (
              <div key={r} className="flex flex-col gap-4 min-w-[190px]">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">
                  {roundLabel(r, maxRound)}
                </p>
                <div className="flex flex-col justify-around flex-1 gap-6">
                  {roundMatches.map((m) => (
                    <MatchCard key={m.id} match={m} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Champion */}
      {matches.some((m) => m.round === maxRound && m.status === 'COMPLETED') && (() => {
        const final = matches.find((m) => m.round === maxRound && m.status === 'COMPLETED')
        const champ = final?.winnerId === final?.homeUserId ? final?.homeUser : final?.awayUser
        return champ ? (
          <div className="rounded-2xl border border-yellow-600/40 bg-yellow-600/10 p-6 text-center">
            <div className="text-3xl mb-2">🏆</div>
            <p className="text-xs font-semibold uppercase tracking-wider text-yellow-500 mb-1">Champion</p>
            <p className="text-2xl font-bold text-white">{champ.name}</p>
          </div>
        ) : null
      })()}
    </div>
  )
}
