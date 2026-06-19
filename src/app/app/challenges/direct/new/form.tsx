'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DirectChallengeType } from '@/generated/prisma'
import { cn } from '@/lib/utils'

const TYPE_OPTIONS: { value: DirectChallengeType; label: string; unit: string; description: string }[] = [
  { value: 'DISTANCE', label: 'Distance Race', unit: 'km', description: 'Who logs the most km?' },
  { value: 'ACTIVITY_COUNT', label: 'Activity Count', unit: 'activities', description: 'Who logs more activities?' },
  { value: 'ACTIVE_MINUTES', label: 'Active Minutes', unit: 'min', description: 'Who moves the most?' },
]

export default function NewDirectChallengeForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultChallengee = searchParams.get('challengee') ?? ''

  const [type, setType] = useState<DirectChallengeType>('DISTANCE')
  const [targetValue, setTargetValue] = useState('50')
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  })
  const [challengeeId, setChallengeeId] = useState(defaultChallengee)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const selectedType = TYPE_OPTIONS.find((t) => t.value === type)!

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!challengeeId) { setError('Enter a player ID to challenge'); return }
    setError('')
    startTransition(async () => {
      const res = await fetch('/api/challenges/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeeId, type, targetValue: parseFloat(targetValue), endDate, message: message || undefined }),
      })
      const result = await res.json()
      if (result.error) { setError(result.error); return }
      router.push('/app/challenges/direct')
    })
  }

  const inputCls = 'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:border-orange-600'

  return (
    <div className="mx-auto max-w-lg">
      <button onClick={() => router.back()} className="mb-6 text-sm text-slate-400 hover:text-white transition-colors">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-white mb-1">⚔️ New 1v1 Challenge</h1>
        <p className="text-slate-400 text-sm mb-8">Challenge a friend to a head-to-head competition.</p>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          {error && (
            <div className="rounded-lg border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300">{error}</div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Challenge Type</label>
            <div className="grid gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                    type === opt.value
                      ? 'border-orange-600 bg-orange-900/20 text-white'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'
                  )}
                >
                  <span className="flex-1">
                    <span className="block text-sm font-medium">{opt.label}</span>
                    <span className="block text-xs opacity-70">{opt.description}</span>
                  </span>
                  {type === opt.value && <span className="text-orange-400 text-xs font-bold">✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Target ({selectedType.unit})</label>
            <input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} min={1} step={type === 'DISTANCE' ? 0.5 : 1} className={inputCls} />
            <p className="text-xs text-slate-500">First to reach {targetValue} {selectedType.unit} wins</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Challenge Ends</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Player ID to Challenge</label>
            <input type="text" value={challengeeId} onChange={(e) => setChallengeeId(e.target.value)} placeholder="Paste from their profile URL" className={inputCls} />
            <p className="text-xs text-slate-500">Find the ID in the URL of their profile: /app/players/[id]</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Message (optional)</label>
            <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Trash talk or encouragement…" maxLength={200} className={inputCls} />
          </div>

          <button type="submit" disabled={isPending} className="w-full rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold py-3 text-sm transition-colors">
            {isPending ? 'Sending…' : '⚔️ Send Challenge'}
          </button>
        </form>
    </div>
  )
}
