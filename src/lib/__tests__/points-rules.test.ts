import { describe, it, expect, vi } from 'vitest'

vi.mock('@/generated/prisma', () => ({
  ActivityType: {
    RUN: 'RUN',
    WALK: 'WALK',
    CYCLING: 'CYCLING',
    FOOTBALL_TRAINING: 'FOOTBALL_TRAINING',
    FOOTBALL_MATCH: 'FOOTBALL_MATCH',
    FITNESS: 'FITNESS',
    CUSTOM: 'CUSTOM',
  },
  Level: {
    BRONZE: 'BRONZE',
    SILVER: 'SILVER',
    GOLD: 'GOLD',
    ELITE: 'ELITE',
  },
}))

const {
  calculateActivityPoints,
  isSpeedSuspicious,
  getLevelFromPoints,
  MAX_DAILY_ACTIVITY_POINTS,
} = await import('../points-rules')

describe('calculateActivityPoints', () => {
  it('RUN uses distance: 5km = 25pts', () => {
    expect(calculateActivityPoints('RUN' as never, 5)).toBe(25)
  })

  it('RUN with no distance returns 0', () => {
    expect(calculateActivityPoints('RUN' as never, 0)).toBe(0)
    expect(calculateActivityPoints('RUN' as never, undefined)).toBe(0)
  })

  it('FOOTBALL_MATCH is session-based, returns fixed points', () => {
    const pts = calculateActivityPoints('FOOTBALL_MATCH' as never)
    expect(pts).toBe(80)
  })

  it('FOOTBALL_TRAINING returns fixed 50pts', () => {
    expect(calculateActivityPoints('FOOTBALL_TRAINING' as never)).toBe(50)
  })

  it('CYCLING uses distance: 10km = 20pts', () => {
    expect(calculateActivityPoints('CYCLING' as never, 10)).toBe(20)
  })

  it('MAX_DAILY_ACTIVITY_POINTS is 200', () => {
    expect(MAX_DAILY_ACTIVITY_POINTS).toBe(200)
  })
})

describe('isSpeedSuspicious', () => {
  it('RUN at 30 km/h is suspicious (threshold 25)', () => {
    expect(isSpeedSuspicious('RUN' as never, 30)).toBe(true)
  })

  it('RUN at 10 km/h is not suspicious', () => {
    expect(isSpeedSuspicious('RUN' as never, 10)).toBe(false)
  })

  it('FOOTBALL_MATCH has no threshold, never suspicious', () => {
    expect(isSpeedSuspicious('FOOTBALL_MATCH' as never, 999)).toBe(false)
  })
})

describe('getLevelFromPoints', () => {
  it('0 pts = BRONZE', () => expect(getLevelFromPoints(0)).toBe('BRONZE'))
  it('500 pts = SILVER', () => expect(getLevelFromPoints(500)).toBe('SILVER'))
  it('1500 pts = GOLD', () => expect(getLevelFromPoints(1500)).toBe('GOLD'))
  it('3000 pts = ELITE', () => expect(getLevelFromPoints(3000)).toBe('ELITE'))
  it('499 pts = BRONZE (just below SILVER threshold)', () => expect(getLevelFromPoints(499)).toBe('BRONZE'))
  it('2999 pts = GOLD (just below ELITE threshold)', () => expect(getLevelFromPoints(2999)).toBe('GOLD'))
})
