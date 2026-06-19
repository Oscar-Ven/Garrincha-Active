import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createGear, getUserGear } from '@/services/gear'
import { GearType } from '@/generated/prisma'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const gear = await getUserGear(user.id)
  return NextResponse.json(gear)
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, type, brand, model, alertThresholdKm, purchasedAt, notes } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!Object.values(GearType).includes(type)) return NextResponse.json({ error: 'Invalid gear type' }, { status: 400 })

  const gear = await createGear(user.id, {
    name: name.trim(),
    type: type as GearType,
    brand: brand?.trim() || undefined,
    model: model?.trim() || undefined,
    alertThresholdKm: alertThresholdKm ? parseFloat(alertThresholdKm) : undefined,
    purchasedAt: purchasedAt ? new Date(purchasedAt) : undefined,
    notes: notes?.trim() || undefined,
  })

  return NextResponse.json(gear, { status: 201 })
}
