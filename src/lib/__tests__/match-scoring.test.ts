import { describe, it, expect, vi } from 'vitest'

vi.mock('@/generated/prisma', () => ({
  ActivityType: {
    RUN: 'RUN', WALK: 'WALK', CYCLING: 'CYCLING',
    FOOTBALL_TRAINING: 'FOOTBALL_TRAINING', FOOTBALL_MATCH: 'FOOTBALL_MATCH',
    FITNESS: 'FITNESS', CUSTOM: 'CUSTOM',
    PADEL: 'PADEL', TENNIS: 'TENNIS', SQUASH: 'SQUASH',
    PICKLEBALL: 'PICKLEBALL', BADMINTON: 'BADMINTON', RACQUETBALL: 'RACQUETBALL',
  },
}))

const { validateMatchSets, matchPoints } = await import('../match-scoring')

describe('validateMatchSets', () => {
  describe('PADEL best-of-3', () => {
    it('accepts a valid 2-0 result', () => {
      const r = validateMatchSets([{ homeGames: 6, awayGames: 3 }, { homeGames: 6, awayGames: 4 }], 3, 'PADEL' as never)
      expect(r.valid).toBe(true)
      expect(r.winner).toBe('HOME')
      expect(r.homeSetWins).toBe(2)
    })

    it('accepts a valid 2-1 result', () => {
      const r = validateMatchSets([
        { homeGames: 6, awayGames: 3 },
        { homeGames: 3, awayGames: 6 },
        { homeGames: 6, awayGames: 4 },
      ], 3, 'PADEL' as never)
      expect(r.valid).toBe(true)
      expect(r.winner).toBe('HOME')
    })

    it('accepts 7-6 (tiebreak)', () => {
      const r = validateMatchSets([{ homeGames: 7, awayGames: 6 }, { homeGames: 6, awayGames: 2 }], 3, 'PADEL' as never)
      expect(r.valid).toBe(true)
    })

    it('accepts 7-5', () => {
      const r = validateMatchSets([{ homeGames: 7, awayGames: 5 }, { homeGames: 6, awayGames: 3 }], 3, 'PADEL' as never)
      expect(r.valid).toBe(true)
    })

    it('rejects tied set 6-6', () => {
      const r = validateMatchSets([{ homeGames: 6, awayGames: 6 }, { homeGames: 6, awayGames: 3 }], 3, 'PADEL' as never)
      expect(r.valid).toBe(false)
      expect(r.errors[0]).toMatch(/tie/)
    })

    it('rejects invalid score 5-3 (not enough games)', () => {
      const r = validateMatchSets([{ homeGames: 5, awayGames: 3 }, { homeGames: 6, awayGames: 2 }], 3, 'PADEL' as never)
      expect(r.valid).toBe(false)
      expect(r.errors[0]).toMatch(/invalid tennis-style/)
    })

    it('rejects incomplete match (1-0 sets when 2 needed)', () => {
      const r = validateMatchSets([{ homeGames: 6, awayGames: 3 }], 3, 'PADEL' as never)
      expect(r.valid).toBe(false)
      expect(r.winner).toBeNull()
    })

    it('rejects extra sets after match complete', () => {
      const r = validateMatchSets([
        { homeGames: 6, awayGames: 2 },
        { homeGames: 6, awayGames: 1 },
        { homeGames: 6, awayGames: 0 },
      ], 3, 'PADEL' as never)
      expect(r.valid).toBe(false)
      expect(r.errors[0]).toMatch(/extra set/)
    })

    it('rejects more than 3 sets', () => {
      const r = validateMatchSets([
        { homeGames: 6, awayGames: 3 },
        { homeGames: 3, awayGames: 6 },
        { homeGames: 6, awayGames: 4 },
        { homeGames: 6, awayGames: 2 },
      ], 3, 'PADEL' as never)
      expect(r.valid).toBe(false)
    })
  })

  describe('SQUASH best-of-5 (points-style)', () => {
    it('accepts a valid 3-0 result', () => {
      const r = validateMatchSets([
        { homeGames: 11, awayGames: 7 },
        { homeGames: 11, awayGames: 9 },
        { homeGames: 11, awayGames: 5 },
      ], 5, 'SQUASH' as never)
      expect(r.valid).toBe(true)
      expect(r.winner).toBe('HOME')
      expect(r.homeSetWins).toBe(3)
    })

    it('accepts a valid 3-2 result', () => {
      const r = validateMatchSets([
        { homeGames: 11, awayGames: 7 },
        { homeGames: 7, awayGames: 11 },
        { homeGames: 11, awayGames: 9 },
        { homeGames: 9, awayGames: 11 },
        { homeGames: 11, awayGames: 8 },
      ], 5, 'SQUASH' as never)
      expect(r.valid).toBe(true)
    })

    it('rejects a tied game', () => {
      const r = validateMatchSets([
        { homeGames: 11, awayGames: 11 },
        { homeGames: 11, awayGames: 9 },
      ], 5, 'SQUASH' as never)
      expect(r.valid).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('rejects empty sets', () => {
      const r = validateMatchSets([], 3, 'TENNIS' as never)
      expect(r.valid).toBe(false)
    })

    it('rejects negative scores', () => {
      const r = validateMatchSets([{ homeGames: -1, awayGames: 6 }], 3, 'TENNIS' as never)
      expect(r.valid).toBe(false)
    })
  })
})

describe('matchPoints', () => {
  it('awards more points to winner', () => {
    const winPts = matchPoints('PADEL' as never, true)
    const losePts = matchPoints('PADEL' as never, false)
    expect(winPts).toBeGreaterThan(losePts)
    expect(winPts).toBe(90) // 60 * 1.5
    expect(losePts).toBe(30) // 60 * 0.5
  })

  it('tennis has same points as padel', () => {
    expect(matchPoints('TENNIS' as never, true)).toBe(matchPoints('PADEL' as never, true))
  })

  it('squash winner earns 75 pts', () => {
    expect(matchPoints('SQUASH' as never, true)).toBe(75) // 50 * 1.5
  })

  it('badminton winner earns 60 pts', () => {
    expect(matchPoints('BADMINTON' as never, true)).toBe(60) // 40 * 1.5
  })
})
