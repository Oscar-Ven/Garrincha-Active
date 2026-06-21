import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'

vi.mock('@/generated/prisma', () => ({
  ActivityType: {
    PADEL: 'PADEL', TENNIS: 'TENNIS', SQUASH: 'SQUASH',
    PICKLEBALL: 'PICKLEBALL', BADMINTON: 'BADMINTON', RACQUETBALL: 'RACQUETBALL',
    RUN: 'RUN', WALK: 'WALK', CYCLING: 'CYCLING',
    FOOTBALL_TRAINING: 'FOOTBALL_TRAINING', FOOTBALL_MATCH: 'FOOTBALL_MATCH',
    FITNESS: 'FITNESS', CUSTOM: 'CUSTOM',
  },
  FeedPostType: { MATCH_RESULT: 'MATCH_RESULT' },
  MatchFormat: { SINGLES: 'SINGLES', DOUBLES: 'DOUBLES' },
  MatchStatus: { PENDING: 'PENDING', CONFIRMED: 'CONFIRMED', DISPUTED: 'DISPUTED', CANCELLED: 'CANCELLED' },
  MatchParticipantRole: { HOME: 'HOME', AWAY: 'AWAY', HOME_PARTNER: 'HOME_PARTNER', AWAY_PARTNER: 'AWAY_PARTNER' },
  PointsSourceType: { MATCH: 'MATCH' },
}))

// Shared prisma mock instance
const prismaMock = {
  matchResult: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  matchParticipant: {
    update: vi.fn(),
    findMany: vi.fn(),
  },
  playerSportRating: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  feedPost: {
    create: vi.fn(),
  },
  $transaction: vi.fn((arr: unknown[]) => Promise.all(arr instanceof Array ? arr : [arr])),
}

vi.mock('@/lib/db', () => ({ prisma: prismaMock }))
vi.mock('@/services/points', () => ({
  awardPoints: vi.fn().mockResolvedValue(undefined),
}))

const { processConfirmedMatch } = await import('@/services/matches')
const { awardPoints } = await import('@/services/points')

function makeMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: 'match-1',
    sport: 'PADEL',
    format: 'SINGLES',
    status: 'CONFIRMED',
    winnerSide: 'HOME',
    homeSetWins: 2,
    awaySetWins: 0,
    pointsAwarded: false,
    feedPublished: false,
    participants: [
      { userId: 'user-home', role: 'HOME', user: { id: 'user-home' } },
      { userId: 'user-away', role: 'AWAY', user: { id: 'user-away' } },
    ],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.matchResult.update.mockResolvedValue({})
  prismaMock.matchResult.create.mockResolvedValue({})
  prismaMock.feedPost.create.mockResolvedValue({})
  prismaMock.playerSportRating.findMany.mockResolvedValue([])
  prismaMock.playerSportRating.upsert.mockResolvedValue({})
})

describe('processConfirmedMatch', () => {
  it('awards points to both players', async () => {
    prismaMock.matchResult.findUnique.mockResolvedValue(makeMatch())

    await processConfirmedMatch('match-1')

    expect(awardPoints).toHaveBeenCalledTimes(2)
    const calls = (awardPoints as Mock).mock.calls
    const userIds = calls.map((c: unknown[]) => c[0])
    expect(userIds).toContain('user-home')
    expect(userIds).toContain('user-away')
  })

  it('does not award points twice (idempotent)', async () => {
    prismaMock.matchResult.findUnique.mockResolvedValue(makeMatch({ pointsAwarded: true, feedPublished: true }))

    await processConfirmedMatch('match-1')

    expect(awardPoints).not.toHaveBeenCalled()
    expect(prismaMock.feedPost.create).not.toHaveBeenCalled()
  })

  it('does not award points if match is not CONFIRMED', async () => {
    prismaMock.matchResult.findUnique.mockResolvedValue(makeMatch({ status: 'PENDING' }))

    await processConfirmedMatch('match-1')

    expect(awardPoints).not.toHaveBeenCalled()
  })

  it('does not publish feed post twice (idempotent)', async () => {
    prismaMock.matchResult.findUnique.mockResolvedValue(makeMatch({ feedPublished: true }))

    await processConfirmedMatch('match-1')

    expect(prismaMock.feedPost.create).not.toHaveBeenCalled()
  })

  it('creates a feed post on first confirmation', async () => {
    prismaMock.matchResult.findUnique.mockResolvedValue(makeMatch({ pointsAwarded: true }))

    await processConfirmedMatch('match-1')

    expect(prismaMock.feedPost.create).toHaveBeenCalledOnce()
    const call = prismaMock.feedPost.create.mock.calls[0][0]
    expect(call.data.type).toBe('MATCH_RESULT')
    expect(call.data.matchResultId).toBe('match-1')
    expect(call.data.userId).toBe('user-home')
  })

  it('handles non-existent match gracefully', async () => {
    prismaMock.matchResult.findUnique.mockResolvedValue(null)

    await expect(processConfirmedMatch('no-such-id')).resolves.toBeUndefined()
    expect(awardPoints).not.toHaveBeenCalled()
  })

  it('awards winner more points than loser', async () => {
    prismaMock.matchResult.findUnique.mockResolvedValue(makeMatch())

    await processConfirmedMatch('match-1')

    const calls = (awardPoints as Mock).mock.calls
    const homeCall = calls.find((c: unknown[]) => c[0] === 'user-home')!
    const awayCall = calls.find((c: unknown[]) => c[0] === 'user-away')!

    expect(homeCall[1]).toBeGreaterThan(awayCall[1])
  })
})
