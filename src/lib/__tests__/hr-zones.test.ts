import { describe, it, expect } from 'vitest'
import { getZoneForHR, estimateMaxHR, HR_ZONES } from '../hr-zones'

describe('estimateMaxHR', () => {
  it('25-year-old: 220 - 25 = 195', () => expect(estimateMaxHR(25)).toBe(195))
  it('40-year-old: 220 - 40 = 180', () => expect(estimateMaxHR(40)).toBe(180))
  it('default age 30: 220 - 30 = 190', () => expect(estimateMaxHR()).toBe(190))
})

describe('getZoneForHR', () => {
  it('returns zone 1 (Recovery) at 55% of max HR', () => {
    const zone = getZoneForHR(110, 200) // 55%
    expect(zone?.name).toContain('Zone 1')
  })

  it('returns zone 5 (Max Effort) at 95% of max HR', () => {
    const zone = getZoneForHR(190, 200) // 95%
    expect(zone?.name).toContain('Zone 5')
  })

  it('returns a color string', () => {
    const zone = getZoneForHR(150, 200)
    expect(typeof zone?.color).toBe('string')
    expect(zone?.color.length).toBeGreaterThan(0)
  })

  it('returns a benefit string', () => {
    const zone = getZoneForHR(150, 200)
    expect(typeof zone?.benefit).toBe('string')
  })

  it('all zones have min < max', () => {
    for (const z of HR_ZONES) {
      expect(z.min).toBeLessThan(z.max)
    }
  })

  it('zone 3 (Tempo) returned at 75% of max HR', () => {
    const zone = getZoneForHR(150, 200) // 75%
    expect(zone?.name).toContain('Zone 3')
  })
})
