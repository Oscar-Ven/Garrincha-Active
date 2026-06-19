import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  // Verify cron secret
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Find all expired ledger entries where points haven't been zeroed out
  const expired = await prisma.pointsLedger.findMany({
    where: { expiresAt: { lt: now }, points: { gt: 0 } },
    include: { user: { include: { playerProfile: true } } },
  })

  // Group by userId
  const byUser = new Map<string, { userId: string; total: number }>()
  for (const entry of expired) {
    const existing = byUser.get(entry.userId) ?? { userId: entry.userId, total: 0 }
    existing.total += entry.points
    byUser.set(entry.userId, existing)
  }

  // For each user, deduct the expired points from their profile and create a debit entry
  let count = 0
  for (const { userId, total } of byUser.values()) {
    const profile = await prisma.playerProfile.findUnique({ where: { userId } })
    if (!profile) continue
    const deduct = Math.min(total, profile.totalPoints)
    if (deduct <= 0) continue
    await prisma.$transaction([
      prisma.playerProfile.update({
        where: { userId },
        data: { totalPoints: { decrement: deduct } },
      }),
      prisma.pointsLedger.create({
        data: {
          userId,
          sourceType: 'REDEMPTION_DEBIT',
          points: -deduct,
          reason: 'Points expired (1-year inactivity)',
        },
      }),
      // Mark original entries as zeroed by setting points=0
      prisma.pointsLedger.updateMany({
        where: { userId, expiresAt: { lt: now }, points: { gt: 0 } },
        data: { points: 0 },
      }),
    ])
    count++
  }

  return NextResponse.json({ processed: count, expiredEntries: expired.length })
}
