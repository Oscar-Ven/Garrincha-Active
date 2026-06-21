import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { catchApiError } from '@/lib/api-error'
import { disputeMatch } from '@/services/matches'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const note: string | undefined = typeof body.note === 'string' ? body.note : undefined

    const match = await disputeMatch(id, user.id, note)
    return NextResponse.json(match)
  } catch (err) {
    return catchApiError(err)
  }
}
