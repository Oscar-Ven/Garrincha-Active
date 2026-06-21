'use client'

import { HR_ZONES, estimateMaxHR, getZoneForHR } from '@/lib/hr-zones'
import { cn } from '@/lib/utils'

export function HRZonesDisplay({
  heartRateAvg,
  heartRateMax: recordedMax,
}: {
  heartRateAvg: number
  heartRateMax?: number | null
}) {
  const maxHR = recordedMax ?? estimateMaxHR()
  const zone = getZoneForHR(heartRateAvg, maxHR)

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300">Heart Rate Zones</h3>
        {zone && (
          <span className={cn('text-xs font-semibold', zone.color)}>
            {zone.name.split('·')[1]?.trim()} · avg {heartRateAvg} bpm
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {HR_ZONES.map((z) => {
          const minBpm = Math.round((z.min / 100) * maxHR)
          const maxBpm = Math.round((z.max / 100) * maxHR)
          const isActive = zone?.name === z.name
          const pct = Math.min(100, Math.max(0, ((heartRateAvg / maxHR) * 100 - z.min) / (z.max - z.min) * 100))
          return (
            <div key={z.name} className={cn('rounded-lg px-3 py-2 transition-colors', isActive ? 'bg-slate-700' : 'bg-slate-800/30')}>
              <div className="flex items-center justify-between text-xs">
                <span className={cn('font-medium', isActive ? z.color : 'text-slate-500')}>{z.name}</span>
                <span className={cn(isActive ? 'text-slate-300' : 'text-slate-600')}>{minBpm}–{maxBpm} bpm</span>
              </div>
              {isActive && (
                <div className="mt-1.5 h-1 rounded-full bg-slate-600">
                  <div className={cn('h-1 rounded-full bg-current', z.color)} style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-slate-500">Based on {recordedMax ? 'recorded' : 'estimated'} max HR of {maxHR} bpm</p>
    </div>
  )
}
