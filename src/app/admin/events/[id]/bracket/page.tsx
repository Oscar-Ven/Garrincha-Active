'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { roundLabel } from '@/lib/bracket'

interface Player { id: string; name: string; avatarUrl?: string | null }
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

function ScoreForm({ match, onSaved }: { match: Match; onSaved: () => void }) {
  const [home, setHome] = useState('')
  const [away, setAway] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    const h = Number(home)
    const a = Number(away)
    if (h === a) { setErr('No draws — scores must differ.'); return }
    setSaving(true)
    const res = await fetch(`/api/events/${match.id.split('-')[0]}/bracket`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: match.id, homeScore: h, awayScore: a }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setErr(d.error ?? 'Failed to save')
    } else {
      onSaved()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2">
      <input
        type="number" min="0" value={home} onChange={(e) => setHome(e.target.value)}
        placeholder={match.homeUser?.name ?? 'Home'}
        className="w-14 rounded border border-slate-600 bg-slate-700 px-2 py-1 text-center text-sm text-white"
        required
      />
      <span className="text-slate-500 text-xs">vs</span>
      <input
        type="number" min="0" value={away} onChange={(e) => setAway(e.target.value)}
        placeholder={match.awayUser?.name ?? 'Away'}
        className="w-14 rounded border border-slate-600 bg-slate-700 px-2 py-1 text-center text-sm text-white"
        required
      />
      <button
        type="submit" disabled={saving}
        className="rounded bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition-colors"
      >
        {saving ? '…' : 'Save'}
      </button>
      {err && <span className="text-xs text-red-400">{err}</span>}
    </form>
  )
}

function AdminMatchCard({ match, eventId, onSaved }: { match: Match; eventId: string; onSaved: () => void }) {
  const homeWon = match.winnerId === match.homeUserId && match.status === 'COMPLETED'
  const awayWon = match.winnerId === match.awayUserId && match.status === 'COMPLETED'
  const isBye = !match.homeUserId || !match.awayUserId
  const pending = match.status === 'PENDING' && match.homeUserId && match.awayUserId

  // For PATCH calls we need eventId in the URL — pass it via closure
  const patchUrl = `/api/events/${eventId}/bracket`

  async function saveWithUrl(e: React.FormEvent, h: number, a: number) {
    e.preventDefault()
    const res = await fetch(patchUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: match.id, homeScore: h, awayScore: a }),
    })
    if (res.ok) onSaved()
  }

  return (
    <div className={cn('rounded-xl border bg-slate-800/60 p-3 min-w-[220px] w-[220px] space-y-2', isBye ? 'border-slate-700/30 opacity-50' : 'border-slate-700')}>
      <div className="space-y-1">
        {[{ user: match.homeUser, won: homeWon, score: match.homeScore }, { user: match.awayUser, won: awayWon, score: match.awayScore }].map(({ user, won, score }, i) => (
          <div key={i} className={cn('flex items-center justify-between gap-2 rounded px-2 py-1', won && 'bg-green-600/10')}>
            <div className="flex items-center gap-2 min-w-0">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} className="h-5 w-5 rounded-full object-cover" alt={user.name} />
                : <div className="h-5 w-5 rounded-full bg-slate-600 flex items-center justify-center text-xs text-white">{user ? user.name[0] : '?'}</div>
              }
              <span className={cn('text-sm truncate', won ? 'font-semibold text-white' : user ? 'text-slate-300' : 'text-slate-600 italic')}>
                {user?.name ?? (match.status === 'PENDING' ? 'TBD' : 'BYE')}
              </span>
            </div>
            {score != null && <span className={cn('text-sm font-bold', won ? 'text-green-400' : 'text-slate-500')}>{score}</span>}
          </div>
        ))}
      </div>

      {pending && <InlineScoreForm matchId={match.id} patchUrl={patchUrl} onSaved={onSaved} />}
      {match.status === 'COMPLETED' && !isBye && (
        <p className="text-xs text-green-500 font-medium">Completed</p>
      )}
    </div>
  )
}

function InlineScoreForm({ matchId, patchUrl, onSaved }: { matchId: string; patchUrl: string; onSaved: () => void }) {
  const [home, setHome] = useState('')
  const [away, setAway] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const h = Number(home)
    const a = Number(away)
    if (h === a) { setErr('No draws'); return }
    setSaving(true)
    const res = await fetch(patchUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, homeScore: h, awayScore: a }),
    })
    setSaving(false)
    if (res.ok) { onSaved() } else {
      const d = await res.json()
      setErr(d.error ?? 'Failed')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      <div className="flex items-center gap-1">
        <input type="number" min="0" value={home} onChange={(e) => setHome(e.target.value)}
          className="w-12 rounded border border-slate-600 bg-slate-700 px-1 py-1 text-center text-xs text-white" required />
        <span className="text-slate-600 text-xs">—</span>
        <input type="number" min="0" value={away} onChange={(e) => setAway(e.target.value)}
          className="w-12 rounded border border-slate-600 bg-slate-700 px-1 py-1 text-center text-xs text-white" required />
        <button type="submit" disabled={saving}
          className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-500 disabled:opacity-50">
          {saving ? '…' : '✓'}
        </button>
      </div>
      {err && <p className="text-xs text-red-400">{err}</p>}
    </form>
  )
}

export default function AdminBracketPage() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [genMsg, setGenMsg] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/events/${id}/bracket`)
    const d = await res.json()
    setEvent(d.event)
    setMatches(d.matches ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function generateBracket() {
    setGenerating(true)
    setGenMsg('')
    const res = await fetch(`/api/events/${id}/bracket`, { method: 'POST' })
    const d = await res.json()
    setGenerating(false)
    if (res.ok) {
      setGenMsg(`Bracket generated: ${d.players} players, ${d.rounds} rounds.`)
      load()
    } else {
      setGenMsg(d.error ?? 'Failed to generate bracket.')
    }
  }

  const maxRound = matches.length > 0 ? Math.max(...matches.map((m) => m.round)) : 0
  const rounds = Array.from({ length: maxRound }, (_, i) => i + 1)

  return (
    <div className="px-4 pb-12 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/events" className="text-slate-400 hover:text-slate-200 transition-colors">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">{event?.title ?? 'Event'} — Bracket Admin</h1>
          <p className="text-sm text-slate-400">Manage tournament bracket</p>
        </div>
      </div>

      {/* Generate / Re-seed */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-white">
            {matches.length === 0 ? 'No bracket yet' : `${matches.length} matches · ${maxRound} round${maxRound !== 1 ? 's' : ''}`}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {matches.length === 0 ? 'Click to seed the bracket from confirmed registrations.' : 'Click to regenerate (deletes existing scores).'}
          </p>
        </div>
        <button
          onClick={generateBracket} disabled={generating || loading}
          className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          {generating ? 'Generating…' : matches.length === 0 ? 'Generate Bracket' : 'Re-seed Bracket'}
        </button>
      </div>
      {genMsg && <p className={cn('text-sm', genMsg.toLowerCase().includes('fail') || genMsg.toLowerCase().includes('error') ? 'text-red-400' : 'text-green-400')}>{genMsg}</p>}

      {/* Loading */}
      {loading && (
        <div className="flex h-32 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      )}

      {/* Bracket */}
      {!loading && matches.length > 0 && (
        <div className="overflow-x-auto">
          <div className="flex gap-8 pb-4" style={{ minWidth: `${rounds.length * 250}px` }}>
            {rounds.map((r) => {
              const roundMatches = matches.filter((m) => m.round === r)
              return (
                <div key={r} className="flex flex-col gap-4 min-w-[230px]">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">
                    {roundLabel(r, maxRound)}
                  </p>
                  <div className="flex flex-col justify-around flex-1 gap-6">
                    {roundMatches.map((m) => (
                      <AdminMatchCard key={m.id} match={m} eventId={id} onSaved={load} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Champion announcement */}
      {!loading && matches.some((m) => m.round === maxRound && m.status === 'COMPLETED') && (() => {
        const final = matches.find((m) => m.round === maxRound && m.status === 'COMPLETED')
        const champ = final?.winnerId === final?.homeUserId ? final?.homeUser : final?.awayUser
        return champ ? (
          <div className="rounded-2xl border border-yellow-600/40 bg-yellow-600/10 p-6 text-center">
            <div className="text-3xl mb-2">🏆</div>
            <p className="text-xs font-semibold uppercase tracking-wider text-yellow-500 mb-1">Tournament Champion</p>
            <p className="text-2xl font-bold text-white">{champ.name}</p>
          </div>
        ) : null
      })()}
    </div>
  )
}
