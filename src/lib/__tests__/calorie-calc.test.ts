import { describe, it, expect, vi } from 'vitest'

// Mock Prisma enum so the lib can be imported without DB
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
}))

const { estimateCalories } = await import('../calorie-calc')

describe('estimateCalories', () => {
  it('RUN 60 min 70kg ≈ 686 kcal (MET 9.8)', () => {
    expect(estimateCalories('RUN' as never, 60, 70)).toBe(686)
  })

  it('WALK 30 min 70kg ≈ 123 kcal (MET 3.5)', () => {
    expect(estimateCalories('WALK' as never, 30, 70)).toBe(123)
  })

  it('FOOTBALL_MATCH 90 min 80kg ≈ 1200 kcal (MET 10.0)', () => {
    expect(estimateCalories('FOOTBALL_MATCH' as never, 90, 80)).toBe(1200)
  })

  it('duration 0 returns 0', () => {
    expect(estimateCalories('RUN' as never, 0)).toBe(0)
  })

  it('uses default 70kg weight', () => {
    const withDefault = estimateCalories('RUN' as never, 60)
    const explicit = estimateCalories('RUN' as never, 60, 70)
    expect(withDefault).toBe(explicit)
  })

  it('heavier player burns more calories', () => {
    const light = estimateCalories('RUN' as never, 60, 60)
    const heavy = estimateCalories('RUN' as never, 60, 90)
    expect(heavy).toBeGreaterThan(light)
  })
})
