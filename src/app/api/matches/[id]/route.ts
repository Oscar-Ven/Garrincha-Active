import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { catchApiError } from '@/lib/api-error'
import { getMatch } from '@/services/matches'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const match = await getMatch(id)
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

    const isParticipant = match.participants.some((p) => p.userId === user.id)
    if (!isParticipant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    return NextResponse.json(match)
  } catch (err) {
    return catchApiError(err)
  }
}
