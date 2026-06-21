'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Court { id: string; name: string; sport: string | null; description: string | null; isActive: boolean; center: { id: string; name: string } }
interface Center { id: string; name: string }

export default function AdminCourtsPage() {
  const [courts, setCourts] = useState<Court[]>([])
  const [centers, setCenters] = useState<Center[]>([])
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({ centerId: '', name: '', sport: '', description: '' })

  useEffect(() => {
    fetch('/api/courts').then((r) => r.json()).then(setCourts)
    fetch('/api/admin/centers').then((r) => r.json()).then(setCenters)
  }, [])

  function set(k: keyof typeof form, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/admin/courts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to create court.'); return }
      setSuccess(true)
      setCourts((prev) => [data, ...prev])
      setForm({ centerId: form.centerId, name: '', sport: '', description: '' })
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Courts</h1>
        <p className="text-sm text-slate-400">{courts.length} courts registered</p>
      </div>

      {/* Create form */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 px-5 py-5 space-y-4 max-w-lg">
        <h2 className="text-sm font-semibold text-slate-300">Add New Court</h2>
        {error && <div className="text-sm text-red-400">{error}</div>}
        {success && <div className="text-sm text-green-400">Court added!</div>}
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Center</label>
            <select value={form.centerId} onChange={(e) => set('centerId', e.target.value)} required
              className="rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="">Select center…</option>
              {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Court name</label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Court 1" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Sport (optional)</label>
              <Input value={form.sport} onChange={(e) => set('sport', e.target.value)} placeholder="Football" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Description</label>
            <Input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="5-a-side turf" />
          </div>
          <Button type="submit" disabled={pending} size="md">{pending ? 'Creating…' : 'Add Court'}</Button>
        </form>
      </div>

      {/* Courts table */}
      {courts.length > 0 && (
        <div className="rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/80">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Court</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Center</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Sport</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {courts.map((c) => (
                <tr key={c.id} className="bg-slate-800/30 hover:bg-slate-800/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                  <td className="px-4 py-3 text-slate-300">{c.center.name}</td>
                  <td className="px-4 py-3 text-slate-400">{c.sport ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${c.isActive ? 'border-green-600/40 bg-green-600/10 text-green-400' : 'border-slate-600/40 bg-slate-600/10 text-slate-400'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
