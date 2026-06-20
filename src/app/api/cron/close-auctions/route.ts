import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { NotificationType } from '@/generated/prisma'
import { notifyUser } from '@/lib/notify'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Find all unsettled auctions whose end time has passed
  const expired = await prisma.rewardAuction.findMany({
    where: { isSettled: false, endTime: { lt: now } },
    include: {
      bids: { orderBy: { points: 'desc' }, take: 1 },
      reward: { select: { title: true } },
    },
  })

  let settled = 0

  for (const auction of expired) {
    const topBid = auction.bids[0]

    if (!topBid) {
      // No bids — mark settled with no winner
      await prisma.rewardAuction.update({
        where: { id: auction.id },
        data: { isSettled: true },
      })
      settled++
      continue
    }

    // Deduct winning bid from winner's points, then notify (outside tx so push can fire)
    const winnerId = topBid.userId
    const rewardTitle = auction.reward.title

    await prisma.$transaction(async (tx) => {
      await tx.rewardAuction.update({
        where: { id: auction.id },
        data: { isSettled: true, winnerId },
      })

      // Cap deduction at current balance to avoid going negative
      const profile = await tx.playerProfile.findUnique({
        where: { userId: winnerId },
        select: { totalPoints: true },
      })

      const deduct = Math.min(topBid.points, profile?.totalPoints ?? 0)

      await tx.playerProfile.update({
        where: { userId: winnerId },
        data: { totalPoints: { decrement: deduct } },
      })

      await tx.pointsLedger.create({
        data: {
          userId: winnerId,
          sourceType: 'REDEMPTION_DEBIT',
          sourceId: auction.id,
          points: -deduct,
          reason: `Won auction: ${rewardTitle}`,
        },
      })
    })

    await notifyUser(winnerId, {
      type: NotificationType.AUCTION_WON,
      title: 'You won the auction!',
      body: `Congratulations! You won "${rewardTitle}" with a bid of ${topBid.points} pts. Contact us to claim your reward.`,
      linkUrl: '/app/rewards/auctions',
    })

    settled++
  }

  return NextResponse.json({ checked: expired.length, settled })
}
