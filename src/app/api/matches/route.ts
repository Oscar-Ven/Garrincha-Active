import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { catchApiError, ApiError } from '@/lib/api-error'
import { createMatch, getMatchesForUser } from '@/services/matches'
import { ActivityType, MatchFormat, MatchSurface, MatchStatus } from '@/generated/prisma'
import type { BestOf } from '@/lib/match-scoring'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const sport = searchParams.get('sport') as ActivityType | null
    const status = searchParams.get('status') as MatchStatus | null

    const result = await getMatchesForUser(user.id, { page, limit, sport: sport ?? undefined, status: status ?? undefined })
    return NextResponse.json(result)
  } catch (err) {
    return catchApiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      sport, format, bestOf, surface, courtId, playedAt, notes, sets,
      awayUserId, homePartnerUserId, awayPartnerUserId,
    } = body

    if (!sport || !Object.values(ActivityType).includes(sport)) {
      throw new ApiError('Invalid sport', 400)
    }
    if (!format || !Object.values(MatchFormat).includes(format)) {
      throw new ApiError('Invalid format', 400)
    }
    if (bestOf !== 3 && bestOf !== 5) {
      throw new ApiError('bestOf must be 3 or 5', 400)
    }
    if (!Array.isArray(sets) || sets.length === 0) {
      throw new ApiError('sets must be a non-empty array', 400)
    }
    if (!awayUserId || typeof awayUserId !== 'string') {
      throw new ApiError('awayUserId is required', 400)
    }
    if (awayUserId === user.id) {
      throw new ApiError('Cannot record a match against yourself', 400)
    }

    const match = await createMatch({
      sport: sport as ActivityType,
      format: format as MatchFormat,
      bestOf: bestOf as BestOf,
      surface: surface as MatchSurface | undefined,
      courtId: courtId ?? undefined,
      playedAt: playedAt ? new Date(playedAt) : undefined,
      notes: notes ?? undefined,
      sets,
      homeUserId: user.id,
      awayUserId,
      homePartnerUserId: homePartnerUserId ?? undefined,
      awayPartnerUserId: awayPartnerUserId ?? undefined,
    })

    return NextResponse.json(match, { status: 201 })
  } catch (err) {
    return catchApiError(err)
  }
}
