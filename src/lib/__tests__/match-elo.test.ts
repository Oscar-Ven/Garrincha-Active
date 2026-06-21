import { describe, it, expect, vi } from 'vitest'

vi.mock('@/generated/prisma', () => ({
  ActivityType: {
    PADEL: 'PADEL', TENNIS: 'TENNIS', SQUASH: 'SQUASH',
    PICKLEBALL: 'PICKLEBALL', BADMINTON: 'BADMINTON', RACQUETBALL: 'RACQUETBALL',
    RUN: 'RUN', WALK: 'WALK', CYCLING: 'CYCLING',
    FOOTBALL_TRAINING: 'FOOTBALL_TRAINING', FOOTBALL_MATCH: 'FOOTBALL_MATCH',
    FITNESS: 'FITNESS', CUSTOM: 'CUSTOM',
  },
}))

const { computeSportElo, teamRating, sportEloLabel } = await import('../match-elo')

describe('computeSportElo', () => {
  it('winner gains rating, loser loses rating', () => {
    const home = { rating: 1000, wins: 5, losses: 5 }
    const away = { rating: 1000, wins: 5, losses: 5 }
    const result = computeSportElo(home, away, 'HOME')
    expect(result.homeNewRating).toBeGreaterThan(1000)
    expect(result.awayNewRating).toBeLessThan(1000)
    expect(result.homeDelta).toBeGreaterThan(0)
    expect(result.awayDelta).toBeLessThan(0)
  })

  it('upsets yield bigger gains', () => {
    const underdog = { rating: 900, wins: 10, losses: 10 }
    const favourite = { rating: 1100, wins: 10, losses: 10 }
    const result = computeSportElo(underdog, favourite, 'HOME')
    expect(result.homeDelta).toBeGreaterThan(8) // big gain for upset
    expect(result.awayDelta).toBeLessThan(-8)   // big loss for favourite
  })

  it('expected wins yield smaller gains', () => {
    const favourite = { rating: 1200, wins: 20, losses: 5 }
    const underdog = { rating: 800, wins: 5, losses: 20 }
    const upsetResult = computeSportElo(favourite, underdog, 'HOME')
    expect(upsetResult.homeDelta).toBeGreaterThan(0)
    expect(upsetResult.homeDelta).toBeLessThan(8) // small gain as expected
  })

  it('rating floor never goes below 800', () => {
    const weak = { rating: 805, wins: 0, losses: 50 }
    const strong = { rating: 1500, wins: 50, losses: 0 }
    const result = computeSportElo(weak, strong, 'AWAY')
    expect(result.homeNewRating).toBeGreaterThanOrEqual(800)
  })

  it('new players get higher K (bigger swings)', () => {
    const newPlayer = { rating: 1000, wins: 2, losses: 2 }
    const establishedPlayer = { rating: 1000, wins: 20, losses: 20 }
    const r1 = computeSportElo(newPlayer, { rating: 1000, wins: 2, losses: 2 }, 'HOME')
    const r2 = computeSportElo(establishedPlayer, { rating: 1000, wins: 20, losses: 20 }, 'HOME')
    expect(Math.abs(r1.homeDelta)).toBeGreaterThanOrEqual(Math.abs(r2.homeDelta))
  })
})

describe('teamRating', () => {
  it('averages two ratings', () => {
    expect(teamRating(1000, 1200)).toBe(1100)
    expect(teamRating(900, 1100)).toBe(1000)
  })

  it('rounds to nearest integer', () => {
    expect(teamRating(1000, 1001)).toBe(1001)
    expect(Number.isInteger(teamRating(1001, 1000))).toBe(true)
  })
})

describe('sportEloLabel', () => {
  it('labels beginner below 900', () => {
    expect(sportEloLabel(850)).toBe('Beginner')
  })

  it('labels recreational 900-1050', () => {
    expect(sportEloLabel(1000)).toBe('Recreational')
  })

  it('labels intermediate 1050-1200', () => {
    expect(sportEloLabel(1100)).toBe('Intermediate')
  })

  it('labels advanced 1200-1350', () => {
    expect(sportEloLabel(1300)).toBe('Advanced')
  })

  it('labels expert 1350-1500', () => {
    expect(sportEloLabel(1400)).toBe('Expert')
  })

  it('labels elite above 1500', () => {
    expect(sportEloLabel(1600)).toBe('Elite')
  })
})
