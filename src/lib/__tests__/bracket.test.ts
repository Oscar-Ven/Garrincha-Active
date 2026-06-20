import { describe, it, expect } from 'vitest'
import { seedBracket, totalRounds, roundLabel } from '../bracket'

describe('totalRounds', () => {
  it('2 players = 1 round', () => expect(totalRounds(2)).toBe(1))
  it('4 players = 2 rounds', () => expect(totalRounds(4)).toBe(2))
  it('8 players = 3 rounds', () => expect(totalRounds(8)).toBe(3))
  it('16 players = 4 rounds', () => expect(totalRounds(16)).toBe(4))
  it('3 players pads to 4 = 2 rounds', () => expect(totalRounds(3)).toBe(2))
  it('5 players pads to 8 = 3 rounds', () => expect(totalRounds(5)).toBe(3))
})

describe('seedBracket', () => {
  it('pads 3 players to 4 with one BYE', () => {
    const players = [
      { userId: '1', name: 'A' },
      { userId: '2', name: 'B' },
      { userId: '3', name: 'C' },
    ]
    const seeded = seedBracket(players)
    expect(seeded).toHaveLength(4)
    expect(seeded.filter(s => s.userId === null)).toHaveLength(1)
  })

  it('pads 5 players to 8 with three BYEs', () => {
    const players = Array.from({ length: 5 }, (_, i) => ({ userId: String(i), name: `P${i}` }))
    const seeded = seedBracket(players)
    expect(seeded).toHaveLength(8)
    expect(seeded.filter(s => s.userId === null)).toHaveLength(3)
  })

  it('exact power of 2 needs no BYEs', () => {
    const players = Array.from({ length: 8 }, (_, i) => ({ userId: String(i), name: `P${i}` }))
    const seeded = seedBracket(players)
    expect(seeded).toHaveLength(8)
    expect(seeded.filter(s => s.userId === null)).toHaveLength(0)
  })

  it('preserves player order for existing players', () => {
    const players = [{ userId: 'x', name: 'X' }, { userId: 'y', name: 'Y' }]
    const seeded = seedBracket(players)
    expect(seeded[0].userId).toBe('x')
    expect(seeded[1].userId).toBe('y')
  })
})

describe('roundLabel', () => {
  it('last round is Final', () => expect(roundLabel(3, 3)).toBe('Final'))
  it('second-to-last is Semi-finals', () => expect(roundLabel(2, 3)).toBe('Semi-finals'))
  it('third-to-last is Quarter-finals', () => expect(roundLabel(2, 4)).toBe('Quarter-finals'))
  it('early rounds are Round N', () => expect(roundLabel(1, 5)).toBe('Round 1'))
})
