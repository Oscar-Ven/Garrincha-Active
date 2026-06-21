'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function NewMembershipPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    userEmail: '',
    centerId: '',
    planId: '',
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    notes: '',
  })

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      // Resolve user by email first
      const userRes = await fetch(`/api/admin/users/by-email?email=${encodeURIComponent(form.userEmail)}`)
      if (!userRes.ok) { setError('Player not found with that email.'); return }
      const { id: userId } = await userRes.json()

      const res = await fetch('/api/admin/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, centerId: form.centerId, planId: form.planId || undefined, startDate: form.startDate, expiryDate: form.expiryDate, notes: form.notes }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to create membership.'); return }
      router.push('/admin/memberships')
    })
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/memberships" className="text-slate-400 hover:text-slate-200 transition-colors">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">New Membership</h1>
          <p className="text-sm text-slate-400">Assign a membership to a player</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 px-5 py-5 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Player email</label>
            <Input
              type="email"
              placeholder="player@example.com"
              value={form.userEmail}
              onChange={(e) => set('userEmail', e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Center ID</label>
            <Input
              placeholder="Center ID"
              value={form.centerId}
              onChange={(e) => set('centerId', e.target.value)}
              required
            />
            <p className="text-xs text-slate-500">Find the center ID from the Centers page.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Plan ID (optional)</label>
            <Input
              placeholder="Leave blank for custom membership"
              value={form.planId}
              onChange={(e) => set('planId', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Start date</label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => set('startDate', e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Expiry date</label>
              <Input
                type="date"
                value={form.expiryDate}
                onChange={(e) => set('expiryDate', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              placeholder="Any notes for this membership…"
              className="rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>
        </div>

        <Button type="submit" disabled={pending} size="lg" className="w-full">
          {pending ? 'Creating…' : 'Assign Membership'}
        </Button>
      </form>
    </div>
  )
}
