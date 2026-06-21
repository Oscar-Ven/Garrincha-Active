import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { catchApiError } from '@/lib/api-error'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    await prisma.userAvailability.deleteMany({ where: { id, userId: user.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return catchApiError(err)
  }
}
