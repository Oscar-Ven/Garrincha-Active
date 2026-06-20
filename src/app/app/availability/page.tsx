'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 06:00–22:00

interface Slot { id: string; dayOfWeek: number | null; startHour: number; endHour: number; note: string | null }

export default function AvailabilityPage() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({ dayOfWeek: 1, startHour: 9, endHour: 11, note: '' })
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/availability')
    if (res.ok) setSlots(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (form.endHour <= form.startHour) { setError('End time must be after start time.'); return }
    startTransition(async () => {
      const res = await fetch('/api/availability', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to save.'); return }
      setSlots((prev) => [...prev, data])
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await fetch(`/api/availability/${id}`, { method: 'DELETE' })
      setSlots((prev) => prev.filter((s) => s.id !== id))
    })
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 pb-12">
      <div className="flex items-center gap-3">
        <Link href="/app/sessions" className="text-slate-400 hover:text-slate-200 transition-colors">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">My Availability</h1>
          <p className="text-sm text-slate-400">Let others know when you&apos;re free to play</p>
        </div>
      </div>

      {/* Current slots */}
      {!loading && slots.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your schedule</p>
          {slots.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {s.dayOfWeek != null ? DAYS[s.dayOfWeek] : 'Specific date'} · {String(s.startHour).padStart(2,'0')}:00 – {String(s.endHour).padStart(2,'0')}:00
                </p>
                {s.note && <p className="text-xs text-slate-400">{s.note}</p>}
              </div>
              <button type="button" onClick={() => handleDelete(s.id)} disabled={pending} className="text-slate-500 hover:text-red-400 transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add slot form */}
      {error && <div className="rounded-xl border border-red-600/40 bg-red-900/30 px-4 py-3 text-sm text-red-300">{error}</div>}
      <form onSubmit={handleAdd} className="rounded-xl border border-slate-700 bg-slate-800/50 px-5 py-5 space-y-4">
        <p className="text-sm font-semibold text-slate-300">Add availability window</p>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400">Day of week</label>
          <select value={form.dayOfWeek} onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: Number(e.target.value) }))}
            className="rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500">
            {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">From</label>
            <select value={form.startHour} onChange={(e) => setForm((f) => ({ ...f, startHour: Number(e.target.value) }))}
              className="rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500">
              {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Until</label>
            <select value={form.endHour} onChange={(e) => setForm((f) => ({ ...f, endHour: Number(e.target.value) }))}
              className="rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500">
              {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400">Note (optional)</label>
          <input type="text" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="e.g. Available for 5-a-side"
            className="rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>

        <button type="submit" disabled={pending}
          className="w-full rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white hover:bg-green-500 disabled:opacity-60 transition-colors">
          {pending ? 'Saving…' : 'Add Window'}
        </button>
      </form>
    </div>
  )
}
