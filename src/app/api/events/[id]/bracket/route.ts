import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { seedBracket, totalRounds } from '@/lib/bracket'
import { catchApiError } from '@/lib/api-error'

type Params = { params: Promise<{ id: string }> }

// GET /api/events/[id]/bracket — return bracket state
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const [event, matches] = await Promise.all([
      prisma.event.findUnique({
        where: { id },
        include: {
          registrations: {
            where: { waitlisted: false },
            include: { user: { select: { id: true, name: true, nickname: true, avatarUrl: true } } },
            orderBy: { registeredAt: 'asc' },
          },
        },
      }),
      prisma.tournamentMatch.findMany({
        where: { eventId: id },
        include: {
          homeUser: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
          awayUser: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
          winner: { select: { id: true, name: true } },
        },
        orderBy: [{ round: 'asc' }, { matchIndex: 'asc' }],
      }),
    ])

    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    return NextResponse.json({ event, matches })
  } catch (err) {
    return catchApiError(err)
  }
}

// POST /api/events/[id]/bracket — seed/generate the bracket (admin only)
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'PLATFORM_ADMIN' && user.role !== 'CENTER_ADMIN' && user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        registrations: {
          where: { waitlisted: false },
          include: { user: { select: { id: true, name: true } } },
          orderBy: { registeredAt: 'asc' },
        },
      },
    })
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const players = event.registrations.map((r) => ({
      userId: r.userId,
      name: r.user.name,
    }))

    if (players.length < 2) return NextResponse.json({ error: 'Need at least 2 registered players.' }, { status: 400 })

    // Guard: refuse to re-seed once any match has been played
    const playedCount = await prisma.tournamentMatch.count({
      where: { eventId: id, status: { not: 'PENDING' } },
    })
    if (playedCount > 0) {
      return NextResponse.json(
        { error: 'Tournament has started — cannot re-seed. One or more matches have already been completed.' },
        { status: 409 },
      )
    }

    const seeded = seedBracket(players)
    const rounds = totalRounds(seeded.length)

    // Delete existing PENDING matches and reseed
    await prisma.tournamentMatch.deleteMany({ where: { eventId: id } })

    const round1Matches = seeded.length / 2
    const matchData = []
    for (let i = 0; i < round1Matches; i++) {
      const home = seeded[i * 2]
      const away = seeded[i * 2 + 1]
      matchData.push({
        eventId: id,
        round: 1,
        matchIndex: i,
        homeUserId: home.userId,
        awayUserId: away.userId === null ? null : away.userId, // null = BYE
        // Auto-advance if one side is BYE
        winnerId: away.userId === null ? home.userId : (home.userId === null ? away.userId : null),
        status: away.userId === null || home.userId === null ? 'COMPLETED' : 'PENDING',
      })
    }

    // Create empty placeholder matches for subsequent rounds
    for (let r = 2; r <= rounds; r++) {
      const matchesInRound = Math.pow(2, rounds - r)
      for (let i = 0; i < matchesInRound; i++) {
        matchData.push({ eventId: id, round: r, matchIndex: i, status: 'PENDING' })
      }
    }

    await prisma.tournamentMatch.createMany({ data: matchData as never[] })

    return NextResponse.json({ ok: true, rounds, players: players.length })
  } catch (err) {
    return catchApiError(err)
  }
}

// PATCH /api/events/[id]/bracket — record a match result
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'PLATFORM_ADMIN' && user.role !== 'CENTER_ADMIN' && user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { matchId, homeScore, awayScore } = await req.json()

    const match = await prisma.tournamentMatch.findFirst({
      where: { id: matchId, eventId: id },
    })
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    if (homeScore == null || awayScore == null || homeScore === awayScore)
      return NextResponse.json({ error: 'Scores required and cannot be equal (no draws in brackets).' }, { status: 400 })

    const winnerId = homeScore > awayScore ? match.homeUserId : match.awayUserId

    await prisma.tournamentMatch.update({
      where: { id: matchId },
      data: { homeScore, awayScore, winnerId, status: 'COMPLETED' },
    })

    // Advance winner to next round
    const nextRound = match.round + 1
    const nextMatchIndex = Math.floor(match.matchIndex / 2)
    const isHome = match.matchIndex % 2 === 0

    const nextMatch = await prisma.tournamentMatch.findUnique({
      where: { eventId_round_matchIndex: { eventId: id, round: nextRound, matchIndex: nextMatchIndex } },
    })

    if (nextMatch) {
      await prisma.tournamentMatch.update({
        where: { id: nextMatch.id },
        data: isHome ? { homeUserId: winnerId } : { awayUserId: winnerId },
      })
    }

    return NextResponse.json({ ok: true, winnerId })
  } catch (err) {
    return catchApiError(err)
  }
}
