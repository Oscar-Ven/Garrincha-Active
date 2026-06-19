import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST() {
  const session = await getCurrentUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.oAuthAccount.deleteMany({
    where: { userId: session.id, provider: 'strava' },
  })

  return NextResponse.json({ ok: true })
}
