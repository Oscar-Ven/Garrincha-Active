import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { eloUpdate } from '@/lib/elo'
import { catchApiError } from '@/lib/api-error'

// POST /api/elo  — record a match result and update both players' Elo ratings
// Body: { opponentId, outcome: 'win'|'draw'|'loss' }
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { opponentId, outcome } = await req.json()
    if (!opponentId || !['win', 'draw', 'loss'].includes(outcome))
      return NextResponse.json({ error: 'opponentId and outcome (win/draw/loss) required.' }, { status: 400 })

    if (opponentId === user.id)
      return NextResponse.json({ error: 'Cannot record a match against yourself.' }, { status: 400 })

    const [myProfile, theirProfile] = await Promise.all([
      prisma.playerProfile.findUnique({ where: { userId: user.id }, select: { eloRating: true } }),
      prisma.playerProfile.findUnique({ where: { userId: opponentId }, select: { eloRating: true } }),
    ])

    const myElo = myProfile?.eloRating ?? 1000
    const theirElo = theirProfile?.eloRating ?? 1000

    const { newA, newB, deltaA } = eloUpdate(myElo, theirElo, outcome as 'win' | 'draw' | 'loss')

    await Promise.all([
      prisma.playerProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, eloRating: newA },
        update: { eloRating: newA },
      }),
      prisma.playerProfile.upsert({
        where: { userId: opponentId },
        create: { userId: opponentId, eloRating: newB },
        update: { eloRating: newB },
      }),
    ])

    return NextResponse.json({ myElo: newA, theirElo: newB, delta: deltaA })
  } catch (err) {
    return catchApiError(err)
  }
}
