'use client'

import { useState, useEffect, useTransition } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Court { id: string; name: string; sport: string | null; description: string | null; center: { id: string; name: string } }
interface Booking { startTime: string; endTime: string }

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7) // 07:00 – 21:00
const DURATIONS = [30, 60, 90, 120]

function timeLabel(h: number, m = 0) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
function isSlotTaken(h: number, bookings: Booking[]) {
  const slotStart = h * 60
  const slotEnd = slotStart + 60
  return bookings.some((b) => {
    const bs = new Date(b.startTime).getHours() * 60 + new Date(b.startTime).getMinutes()
    const be = new Date(b.endTime).getHours() * 60 + new Date(b.endTime).getMinutes()
    return bs < slotEnd && be > slotStart
  })
}

export default function CourtsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [courts, setCourts] = useState<Court[]>([])
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedHour, setSelectedHour] = useState<number | null>(null)
  const [duration, setDuration] = useState(60)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const centerId = searchParams.get('centerId') ?? ''
    fetch(`/api/courts${centerId ? `?centerId=${centerId}` : ''}`)
      .then((r) => r.json())
      .then(setCourts)
  }, [searchParams])

  useEffect(() => {
    if (!selectedCourt || !date) return
    fetch(`/api/courts/book?courtId=${selectedCourt}&date=${date}`)
      .then((r) => r.json())
      .then(setBookings)
  }, [selectedCourt, date])

  function handleBook() {
    if (!selectedCourt || selectedHour == null) return
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/courts/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtId: selectedCourt, date, startHour: selectedHour, startMinute: 0, durationMinutes: duration, notes }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Booking failed.'); return }
      setSuccess(true)
      setSelectedHour(null)
      // Refresh bookings
      fetch(`/api/courts/book?courtId=${selectedCourt}&date=${date}`).then((r) => r.json()).then(setBookings)
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 pb-12">
      <div className="flex items-center gap-3">
        <Link href="/app/map" className="text-slate-400 hover:text-slate-200 transition-colors">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Book a Court</h1>
          <p className="text-sm text-slate-400">Select a court, pick a slot, done</p>
        </div>
      </div>

      {success && (
        <div className="rounded-xl border border-green-600/40 bg-green-600/10 px-4 py-3 text-sm text-green-300">
          Court booked successfully!
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-600/40 bg-red-900/30 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      {/* Court selector */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Choose a court</p>
        {courts.length === 0 ? (
          <p className="text-sm text-slate-500">No courts available yet.</p>
        ) : (
          courts.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { setSelectedCourt(c.id); setSelectedHour(null); setSuccess(false) }}
              className={cn(
                'w-full rounded-xl border px-4 py-3 text-left transition-colors',
                selectedCourt === c.id
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600',
              )}
            >
              <p className="font-semibold text-white">{c.name}</p>
              <p className="text-xs text-slate-400">{c.center.name}{c.sport ? ` · ${c.sport}` : ''}</p>
            </button>
          ))
        )}
      </div>

      {selectedCourt && (
        <>
          {/* Date + duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => { setDate(e.target.value); setSelectedHour(null) }}
                className="rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
          </div>

          {/* Time slots */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pick a time</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {HOURS.map((h) => {
                const taken = isSlotTaken(h, bookings)
                const selected = selectedHour === h
                return (
                  <button
                    key={h}
                    type="button"
                    disabled={taken}
                    onClick={() => { setSelectedHour(h); setSuccess(false) }}
                    className={cn(
                      'rounded-lg border py-2 text-sm font-medium transition-colors',
                      taken ? 'border-red-600/30 bg-red-900/20 text-red-500 cursor-not-allowed' :
                      selected ? 'border-green-500 bg-green-500/20 text-green-300' :
                      'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500',
                    )}
                  >
                    {timeLabel(h)}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-green-500" />Available</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-red-600" />Taken</span>
            </div>
          </div>

          {selectedHour != null && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Notes (optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. 5v5, bring bibs"
                  className="rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <button
                type="button"
                onClick={handleBook}
                disabled={pending}
                className="w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-500 disabled:opacity-60 transition-colors"
              >
                {pending ? 'Booking…' : `Confirm ${timeLabel(selectedHour)} – ${timeLabel(selectedHour, duration)} · ${duration} min`}
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}
