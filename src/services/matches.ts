import { prisma } from '@/lib/db'
import {
  ActivityType,
  FeedPostType,
  MatchFormat,
  MatchStatus,
  MatchSurface,
  MatchParticipantRole,
  PointsSourceType,
  Prisma,
} from '@/generated/prisma'
import { ApiError } from '@/lib/api-error'
import { validateMatchSets, matchPoints, SetScore, BestOf } from '@/lib/match-scoring'
import { computeSportElo, teamRating, RATED_SPORTS } from '@/lib/match-elo'
import { awardPoints } from '@/services/points'

// ─── Input types ─────────────────────────────────────────────────────────────

export interface CreateMatchInput {
  sport: ActivityType
  format: MatchFormat
  bestOf: BestOf
  surface?: MatchSurface
  courtId?: string
  playedAt?: Date
  notes?: string
  sets: SetScore[]
  /** HOME player (the submitter) */
  homeUserId: string
  /** AWAY player (required for singles + doubles) */
  awayUserId: string
  /** HOME partner (required for doubles) */
  homePartnerUserId?: string
  /** AWAY partner (required for doubles) */
  awayPartnerUserId?: string
}

// ─── Shared include for fetching a match with all relations ──────────────────

const matchInclude = {
  sets: { orderBy: { setNumber: 'asc' as const } },
  participants: {
    include: {
      user: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
    },
  },
  court: { select: { id: true, name: true } },
  feedPost: { select: { id: true } },
} as const

export type MatchFull = Prisma.MatchResultGetPayload<{ include: typeof matchInclude }>

// ─── createMatch ─────────────────────────────────────────────────────────────

export async function createMatch(input: CreateMatchInput): Promise<MatchFull> {
  const {
    sport, format, bestOf, surface, courtId, playedAt, notes, sets,
    homeUserId, awayUserId, homePartnerUserId, awayPartnerUserId,
  } = input

  // Validate doubles partner requirements
  if (format === MatchFormat.DOUBLES) {
    if (!homePartnerUserId || !awayPartnerUserId) {
      throw new ApiError('Doubles matches require home and away partners', 400)
    }
  }

  // Validate score
  const scoreResult = validateMatchSets(sets, bestOf, sport)
  if (!scoreResult.valid) {
    throw new ApiError(`Invalid score: ${scoreResult.errors.join('; ')}`, 400)
  }

  const winner = scoreResult.winner!

  // Verify all participants are real users
  const userIds = [homeUserId, awayUserId, homePartnerUserId, awayPartnerUserId].filter(Boolean) as string[]
  const uniqueIds = [...new Set(userIds)]
  const users = await prisma.user.findMany({ where: { id: { in: uniqueIds } }, select: { id: true } })
  if (users.length !== uniqueIds.length) {
    throw new ApiError('One or more player IDs not found', 400)
  }

  // Build participant records
  const participantData: { userId: string; role: MatchParticipantRole; confirmed: boolean; confirmedAt: Date | null }[] = [
    { userId: homeUserId, role: MatchParticipantRole.HOME, confirmed: true, confirmedAt: new Date() },
    { userId: awayUserId, role: MatchParticipantRole.AWAY, confirmed: false, confirmedAt: null },
  ]
  if (format === MatchFormat.DOUBLES && homePartnerUserId && awayPartnerUserId) {
    participantData.push(
      { userId: homePartnerUserId, role: MatchParticipantRole.HOME_PARTNER, confirmed: false, confirmedAt: null },
      { userId: awayPartnerUserId, role: MatchParticipantRole.AWAY_PARTNER, confirmed: false, confirmedAt: null },
    )
  }

  const match = await prisma.matchResult.create({
    data: {
      sport,
      format,
      surface: surface ?? MatchSurface.UNKNOWN,
      courtId: courtId ?? null,
      status: MatchStatus.PENDING,
      winnerSide: winner,
      homeSetWins: scoreResult.homeSetWins,
      awaySetWins: scoreResult.awaySetWins,
      notes: notes ?? null,
      playedAt: playedAt ?? new Date(),
      sets: {
        create: sets.map((s, i) => ({
          setNumber: i + 1,
          homeGames: s.homeGames,
          awayGames: s.awayGames,
          homeTiebreak: s.homeTiebreak ?? null,
          awayTiebreak: s.awayTiebreak ?? null,
        })),
      },
      participants: { create: participantData },
    },
    include: matchInclude,
  })

  return match
}

// ─── confirmMatch ─────────────────────────────────────────────────────────────

export async function confirmMatch(matchId: string, userId: string): Promise<MatchFull> {
  const match = await prisma.matchResult.findUnique({
    where: { id: matchId },
    include: { participants: true },
  })

  if (!match) throw new ApiError('Match not found', 404)
  if (match.status !== MatchStatus.PENDING) {
    throw new ApiError(`Match is already ${match.status.toLowerCase()}`, 409)
  }

  const participant = match.participants.find((p) => p.userId === userId)
  if (!participant) throw new ApiError('You are not a participant in this match', 403)
  if (participant.confirmed) throw new ApiError('You have already confirmed this match', 409)

  await prisma.matchParticipant.update({
    where: { matchId_userId: { matchId, userId } },
    data: { confirmed: true, confirmedAt: new Date() },
  })

  // Check if all participants have now confirmed
  const updatedParticipants = await prisma.matchParticipant.findMany({ where: { matchId } })
  const allNowConfirmed = updatedParticipants.every((p) => p.confirmed)

  if (allNowConfirmed) {
    await prisma.matchResult.update({
      where: { id: matchId },
      data: { status: MatchStatus.CONFIRMED },
    })
    await processConfirmedMatch(matchId)
  }

  return prisma.matchResult.findUniqueOrThrow({ where: { id: matchId }, include: matchInclude })
}

// ─── disputeMatch ─────────────────────────────────────────────────────────────

export async function disputeMatch(matchId: string, userId: string, note?: string): Promise<MatchFull> {
  const match = await prisma.matchResult.findUnique({
    where: { id: matchId },
    include: { participants: true },
  })

  if (!match) throw new ApiError('Match not found', 404)
  if (match.status === MatchStatus.CONFIRMED) {
    throw new ApiError('Cannot dispute a confirmed match', 409)
  }
  if (match.status === MatchStatus.CANCELLED) {
    throw new ApiError('Cannot dispute a cancelled match', 409)
  }

  const participant = match.participants.find((p) => p.userId === userId)
  if (!participant) throw new ApiError('You are not a participant in this match', 403)

  await prisma.$transaction([
    prisma.matchParticipant.update({
      where: { matchId_userId: { matchId, userId } },
      data: { disputed: true, disputedAt: new Date(), disputeNote: note ?? null },
    }),
    prisma.matchResult.update({
      where: { id: matchId },
      data: { status: MatchStatus.DISPUTED },
    }),
  ])

  return prisma.matchResult.findUniqueOrThrow({ where: { id: matchId }, include: matchInclude })
}

// ─── processConfirmedMatch ───────────────────────────────────────────────────
// Idempotent: guarded by pointsAwarded + feedPublished booleans

export async function processConfirmedMatch(matchId: string): Promise<void> {
  const match = await prisma.matchResult.findUnique({
    where: { id: matchId },
    include: {
      participants: { include: { user: { select: { id: true } } } },
    },
  })

  if (!match) return
  if (match.status !== MatchStatus.CONFIRMED) return

  const winner = match.winnerSide as 'HOME' | 'AWAY' | null
  if (!winner) return

  // ── Points award (idempotent) ──────────────────────────────────────────────
  if (!match.pointsAwarded) {
    const pointsOps: Promise<void>[] = []

    for (const p of match.participants) {
      const isHomeSide = p.role === MatchParticipantRole.HOME || p.role === MatchParticipantRole.HOME_PARTNER
      const isWinner = isHomeSide ? winner === 'HOME' : winner === 'AWAY'
      const pts = matchPoints(match.sport, isWinner)

      pointsOps.push(
        awardPoints(p.userId, pts, PointsSourceType.MATCH, matchId, `${match.sport} match ${isWinner ? 'win' : 'loss'}`),
      )
    }

    await Promise.all(pointsOps)
    await prisma.matchResult.update({
      where: { id: matchId },
      data: { pointsAwarded: true },
    })
  }

  // ── ELO update (idempotent, via pointsAwarded flag — only if rated sport) ──
  if (RATED_SPORTS.has(match.sport)) {
    const homePlayer = match.participants.find((p) => p.role === MatchParticipantRole.HOME)
    const awayPlayer = match.participants.find((p) => p.role === MatchParticipantRole.AWAY)
    const homePartner = match.participants.find((p) => p.role === MatchParticipantRole.HOME_PARTNER)
    const awayPartner = match.participants.find((p) => p.role === MatchParticipantRole.AWAY_PARTNER)

    if (homePlayer && awayPlayer) {
      await updateSportRatings(match.sport, winner, homePlayer.userId, awayPlayer.userId, homePartner?.userId, awayPartner?.userId)
    }
  }

  // ── Feed post (idempotent) ─────────────────────────────────────────────────
  if (!match.feedPublished) {
    const homePlayer = match.participants.find((p) => p.role === MatchParticipantRole.HOME)
    if (homePlayer) {
      await prisma.feedPost.create({
        data: {
          userId: homePlayer.userId,
          type: FeedPostType.MATCH_RESULT,
          matchResultId: matchId,
          content: buildMatchSummary(match.sport, match.format, winner, match.homeSetWins, match.awaySetWins),
        },
      })
      await prisma.matchResult.update({
        where: { id: matchId },
        data: { feedPublished: true },
      })
    }
  }
}

// ─── Sport rating update helper ───────────────────────────────────────────────

async function updateSportRatings(
  sport: ActivityType,
  winner: 'HOME' | 'AWAY',
  homeUserId: string,
  awayUserId: string,
  homePartnerUserId?: string,
  awayPartnerUserId?: string,
): Promise<void> {
  // Upsert ratings for all involved players
  const playerIds = [homeUserId, awayUserId, homePartnerUserId, awayPartnerUserId].filter(Boolean) as string[]

  const existingRatings = await prisma.playerSportRating.findMany({
    where: { userId: { in: playerIds }, sport },
  })

  const ratingMap = new Map(existingRatings.map((r) => [r.userId, r]))

  function getSnapshot(userId: string) {
    const r = ratingMap.get(userId)
    return { rating: r?.rating ?? 1000, wins: r?.wins ?? 0, losses: r?.losses ?? 0 }
  }

  const homeSnap = homePartnerUserId
    ? { rating: teamRating(getSnapshot(homeUserId).rating, getSnapshot(homePartnerUserId).rating), wins: getSnapshot(homeUserId).wins, losses: getSnapshot(homeUserId).losses }
    : getSnapshot(homeUserId)

  const awaySnap = awayPartnerUserId
    ? { rating: teamRating(getSnapshot(awayUserId).rating, getSnapshot(awayPartnerUserId).rating), wins: getSnapshot(awayUserId).wins, losses: getSnapshot(awayUserId).losses }
    : getSnapshot(awayUserId)

  const eloResult = computeSportElo(homeSnap, awaySnap, winner)

  // Apply deltas to individual players
  const updates: Promise<unknown>[] = []

  function upsertRating(userId: string, ratingDelta: number, isWinner: boolean) {
    const snap = getSnapshot(userId)
    const newRating = Math.max(800, snap.rating + ratingDelta)
    updates.push(
      prisma.playerSportRating.upsert({
        where: { userId_sport: { userId, sport } },
        create: {
          userId, sport,
          rating: newRating,
          wins: isWinner ? 1 : 0,
          losses: isWinner ? 0 : 1,
        },
        update: {
          rating: newRating,
          wins: isWinner ? { increment: 1 } : undefined,
          losses: isWinner ? undefined : { increment: 1 },
        },
      }),
    )
  }

  const homeIsWinner = winner === 'HOME'
  upsertRating(homeUserId, eloResult.homeDelta, homeIsWinner)
  upsertRating(awayUserId, eloResult.awayDelta, !homeIsWinner)
  if (homePartnerUserId) upsertRating(homePartnerUserId, eloResult.homeDelta, homeIsWinner)
  if (awayPartnerUserId) upsertRating(awayPartnerUserId, eloResult.awayDelta, !homeIsWinner)

  await Promise.all(updates)
}

// ─── buildMatchSummary ────────────────────────────────────────────────────────

function buildMatchSummary(
  sport: ActivityType,
  format: MatchFormat,
  winner: 'HOME' | 'AWAY',
  homeSetWins: number,
  awaySetWins: number,
): string {
  const sportLabel = sport.charAt(0) + sport.slice(1).toLowerCase().replace(/_/g, ' ')
  const formatLabel = format === MatchFormat.DOUBLES ? 'doubles' : 'singles'
  const score = winner === 'HOME' ? `${homeSetWins}-${awaySetWins}` : `${awaySetWins}-${homeSetWins}`
  return `Won a ${sportLabel} ${formatLabel} match ${score}`
}

// ─── getMatch ─────────────────────────────────────────────────────────────────

export async function getMatch(matchId: string): Promise<MatchFull | null> {
  return prisma.matchResult.findUnique({ where: { id: matchId }, include: matchInclude })
}

// ─── getMatchesForUser ────────────────────────────────────────────────────────

export async function getMatchesForUser(
  userId: string,
  options?: { page?: number; limit?: number; sport?: ActivityType; status?: MatchStatus },
): Promise<{ matches: MatchFull[]; total: number }> {
  const page = options?.page ?? 1
  const limit = options?.limit ?? 20
  const skip = (page - 1) * limit

  const where: Prisma.MatchResultWhereInput = {
    participants: { some: { userId } },
    ...(options?.sport ? { sport: options.sport } : {}),
    ...(options?.status ? { status: options.status } : {}),
  }

  const [matches, total] = await Promise.all([
    prisma.matchResult.findMany({ where, orderBy: { playedAt: 'desc' }, skip, take: limit, include: matchInclude }),
    prisma.matchResult.count({ where }),
  ])

  return { matches, total }
}

// ─── getSportRatings ──────────────────────────────────────────────────────────

export async function getSportRatings(userId: string) {
  return prisma.playerSportRating.findMany({
    where: { userId },
    orderBy: { rating: 'desc' },
  })
}
