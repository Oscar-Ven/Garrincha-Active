import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { retireGear, unretireGear, deleteGear, getGear } from '@/services/gear'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { action } = await req.json()

  if (action === 'retire') {
    await retireGear(id, user.id)
    return NextResponse.json({ ok: true })
  }
  if (action === 'unretire') {
    await unretireGear(id, user.id)
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const gear = await getGear(id, user.id)
  if (!gear) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (gear._count.activities > 0) return NextResponse.json({ error: 'Cannot delete gear linked to activities' }, { status: 400 })
  await deleteGear(id, user.id)
  return NextResponse.json({ ok: true })
}
