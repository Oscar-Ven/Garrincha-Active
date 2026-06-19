'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { GearType } from '@/generated/prisma'
import { cn } from '@/lib/utils'

const GEAR_OPTIONS: { value: GearType; label: string; icon: string; desc: string }[] = [
  { value: GearType.SHOES, label: 'Shoes', icon: '👟', desc: 'Running, football, training shoes' },
  { value: GearType.BIKE, label: 'Bike', icon: '🚴', desc: 'Road, mountain, or city bike' },
  { value: GearType.WETSUIT, label: 'Wetsuit', icon: '🏊', desc: 'Open water or triathlon' },
  { value: GearType.OTHER, label: 'Other', icon: '⚙️', desc: 'Any other equipment' },
]

export default function NewGearPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [type, setType] = useState<GearType>(GearType.SHOES)
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const data = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await fetch('/api/gear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          name: data.get('name'),
          brand: data.get('brand') || undefined,
          model: data.get('model') || undefined,
          alertThresholdKm: data.get('alertThresholdKm') ? parseFloat(data.get('alertThresholdKm') as string) : undefined,
          purchasedAt: data.get('purchasedAt') || undefined,
          notes: data.get('notes') || undefined,
        }),
      })
      const result = await res.json()
      if (!res.ok) { setError(result.error ?? 'Failed to create gear'); return }
      router.push('/app/gear')
    })
  }

  const inputCls = 'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50'

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Add Gear</h1>
          <p className="text-xs text-slate-400">Track mileage on your equipment</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="rounded-xl border border-red-700/40 bg-red-900/15 px-4 py-3 text-sm text-red-300">{error}</div>}

        {/* Type selection */}
        <div>
          <p className="mb-2.5 text-sm font-medium text-slate-300">Equipment Type</p>
          <div className="grid grid-cols-2 gap-2">
            {GEAR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-3 text-left transition-all',
                  type === opt.value
                    ? 'border-green-600/50 bg-green-900/20 ring-2 ring-green-600/40'
                    : 'border-slate-700 bg-slate-800/40 hover:border-slate-500',
                )}
              >
                <span className="text-2xl">{opt.icon}</span>
                <div>
                  <p className={`text-sm font-semibold ${type === opt.value ? 'text-green-300' : 'text-slate-300'}`}>{opt.label}</p>
                  <p className="text-xs text-slate-500">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Name <span className="text-red-400">*</span></label>
            <input name="name" type="text" required maxLength={80} placeholder="e.g. Nike Pegasus 40" disabled={isPending} className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Brand</label>
              <input name="brand" type="text" maxLength={60} placeholder="Nike, Trek, Garmin…" disabled={isPending} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Model</label>
              <input name="model" type="text" maxLength={60} placeholder="Pegasus 40" disabled={isPending} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">
                Alert at (km) <span className="text-slate-500 font-normal">opt.</span>
              </label>
              <input name="alertThresholdKm" type="number" min={0} max={50000} step={1} placeholder="800" disabled={isPending} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">
                Purchased <span className="text-slate-500 font-normal">opt.</span>
              </label>
              <input name="purchasedAt" type="date" disabled={isPending} className={`${inputCls} scheme-dark`} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Notes <span className="text-slate-500 font-normal">(optional)</span></label>
            <textarea name="notes" rows={2} maxLength={300} disabled={isPending}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50" />
          </div>
        </div>

        <div className="flex gap-3 pb-2">
          <button type="button" onClick={() => router.back()} disabled={isPending}
            className="flex-1 rounded-xl border border-slate-700 py-3 text-sm font-medium text-slate-400 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={isPending}
            className="flex-2 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-500 transition-colors disabled:opacity-50">
            {isPending ? 'Adding…' : 'Add Gear'}
          </button>
        </div>
      </form>
    </div>
  )
}
