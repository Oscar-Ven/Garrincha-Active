import { describe, it, expect } from 'vitest'
import { eloUpdate, eloLabel } from '../elo'

describe('eloUpdate', () => {
  it('winner gains points, loser loses same amount', () => {
    const { newA, newB, deltaA } = eloUpdate(1000, 1000, 'win')
    expect(newA).toBeGreaterThan(1000)
    expect(newB).toBeLessThan(1000)
    expect(deltaA).toBeGreaterThan(0)
  })

  it('loser loses points, winner gains same amount', () => {
    const { newA, newB, deltaA } = eloUpdate(1000, 1000, 'loss')
    expect(newA).toBeLessThan(1000)
    expect(newB).toBeGreaterThan(1000)
    expect(deltaA).toBeLessThan(0)
  })

  it('draw near-equal players changes ratings minimally', () => {
    const { deltaA } = eloUpdate(1000, 1000, 'draw')
    expect(Math.abs(deltaA)).toBeLessThanOrEqual(1)
  })

  it('upset: lower-rated player wins gains more points', () => {
    const upset = eloUpdate(800, 1200, 'win')
    const expected = eloUpdate(1200, 800, 'win')
    expect(upset.deltaA).toBeGreaterThan(expected.deltaA)
  })

  it('rating never drops below 800 (floor matches Beginner label)', () => {
    const { newA, newB } = eloUpdate(800, 2000, 'loss')
    expect(newA).toBeGreaterThanOrEqual(800)
    expect(newB).toBeGreaterThanOrEqual(800)
  })

  it('total rating is conserved (within rounding)', () => {
    const before = 1000 + 1200
    const { newA, newB } = eloUpdate(1000, 1200, 'win')
    expect(Math.abs(newA + newB - before)).toBeLessThanOrEqual(1)
  })
})

describe('eloLabel', () => {
  it('maps rating bands correctly', () => {
    expect(eloLabel(700)).toBe('Beginner')
    expect(eloLabel(900)).toBe('Recreational')
    expect(eloLabel(1100)).toBe('Intermediate')
    expect(eloLabel(1300)).toBe('Advanced')
    expect(eloLabel(1500)).toBe('Expert')
  })

  it('boundary at 800 is Recreational not Beginner', () => {
    expect(eloLabel(800)).toBe('Recreational')
  })
})
