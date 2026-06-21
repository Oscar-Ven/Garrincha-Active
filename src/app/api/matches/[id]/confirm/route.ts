import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { catchApiError } from '@/lib/api-error'
import { confirmMatch } from '@/services/matches'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const match = await confirmMatch(id, user.id)
    return NextResponse.json(match)
  } catch (err) {
    return catchApiError(err)
  }
}
