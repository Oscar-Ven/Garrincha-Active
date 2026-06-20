export interface HRZone {
  name: string
  min: number // % of max HR
  max: number
  color: string
  benefit: string
}

export const HR_ZONES: HRZone[] = [
  { name: 'Zone 1 · Recovery',    min: 50, max: 60, color: 'text-slate-400',  benefit: 'Active recovery' },
  { name: 'Zone 2 · Aerobic',     min: 60, max: 70, color: 'text-blue-400',   benefit: 'Fat burning, endurance' },
  { name: 'Zone 3 · Tempo',       min: 70, max: 80, color: 'text-green-400',  benefit: 'Aerobic capacity' },
  { name: 'Zone 4 · Threshold',   min: 80, max: 90, color: 'text-yellow-400', benefit: 'Lactate threshold' },
  { name: 'Zone 5 · Max Effort',  min: 90, max: 100, color: 'text-red-400',   benefit: 'Speed & power' },
]

export function getZoneForHR(hrBpm: number, maxHR: number): HRZone | null {
  const pct = (hrBpm / maxHR) * 100
  return HR_ZONES.find((z) => pct >= z.min && pct < z.max) ?? HR_ZONES[HR_ZONES.length - 1]
}

// Estimate max HR if not recorded: 220 - age (default age 30)
export function estimateMaxHR(age = 30): number {
  return 220 - age
}
