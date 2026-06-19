import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ActivityType } from '@/generated/prisma'

const waypointSchema = z.object({
  sequence: z.number().int().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  elevM: z.number().optional(),
})

const createRouteSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.nativeEnum(ActivityType),
  distanceKm: z.number().positive().max(500),
  elevationM: z.number().min(0).optional(),
  difficulty: z.enum(['EASY', 'MODERATE', 'HARD', 'EXTREME']).optional(),
  waypoints: z.array(waypointSchema).min(2).max(50),
})

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const parsed = createRouteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid data' }, { status: 422 })
  }

  const { title, description, type, distanceKm, elevationM, difficulty, waypoints } = parsed.data

  const route = await prisma.route.create({
    data: {
      title,
      description: description ?? null,
      type,
      distanceKm,
      elevationM: elevationM ?? null,
      difficulty: difficulty ?? null,
      createdById: user.id,
      isPublic: true,
      points: {
        create: waypoints.map((wp) => ({
          sequence: wp.sequence,
          lat: wp.lat,
          lng: wp.lng,
          elevM: wp.elevM ?? null,
        })),
      },
    },
    select: { id: true },
  })

  return NextResponse.json({ id: route.id })
}
