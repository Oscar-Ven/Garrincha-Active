import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Gavel, Clock, Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDistanceToNow, isPast } from 'date-fns'

export const metadata = { title: 'Reward Auctions | Garrincha Active' }

async function placeBid(auctionId: string, points: number) {
  'use server'
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const [auction, profile] = await Promise.all([
    prisma.rewardAuction.findUnique({
      where: { id: auctionId },
      include: { bids: { orderBy: { points: 'desc' }, take: 1 } },
    }),
    prisma.playerProfile.findUnique({ where: { userId: user.id }, select: { totalPoints: true } }),
  ])

  if (!auction || auction.isSettled || isPast(auction.endTime)) {
    return
  }

  const currentHigh = auction.bids[0]?.points ?? auction.minBid - 1
  if (points <= currentHigh) return
  if ((profile?.totalPoints ?? 0) < points) return

  // Upsert bid (each user gets one bid slot, can only increase)
  const existing = await prisma.auctionBid.findUnique({
    where: { auctionId_userId: { auctionId, userId: user.id } },
  })

  if (existing && points <= existing.points) return

  await prisma.auctionBid.upsert({
    where: { auctionId_userId: { auctionId, userId: user.id } },
    create: { auctionId, userId: user.id, points },
    update: { points },
  })

  // Notify previous leader if outbid
  if (auction.bids[0] && auction.bids[0].points < points) {
    const prevBid = auction.bids[0]
    if (prevBid.userId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: prevBid.userId,
          type: 'AUCTION_OUTBID',
          title: 'You\'ve been outbid!',
          body: `Someone placed a higher bid of ${points} pts on the auction`,
          linkUrl: '/app/rewards/auctions',
        },
      })
    }
  }

  revalidatePath('/app/rewards/auctions')
}

export default async function AuctionsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const now = new Date()

  const [activeAuctions, endedAuctions, profile] = await Promise.all([
    prisma.rewardAuction.findMany({
      where: { endTime: { gte: now }, isSettled: false },
      include: {
        reward: { select: { title: true, description: true, category: true, imageUrl: true } },
        bids: {
          orderBy: { points: 'desc' },
          include: { user: { select: { name: true, id: true } } },
          take: 5,
        },
      },
      orderBy: { endTime: 'asc' },
    }),
    prisma.rewardAuction.findMany({
      where: { OR: [{ endTime: { lt: now } }, { isSettled: true }] },
      include: {
        reward: { select: { title: true } },
        winner: { select: { name: true, id: true } },
        bids: { orderBy: { points: 'desc' }, take: 1 },
      },
      orderBy: { endTime: 'desc' },
      take: 10,
    }),
    prisma.playerProfile.findUnique({ where: { userId: user.id }, select: { totalPoints: true } }),
  ])

  const myPoints = profile?.totalPoints ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Gavel className="h-6 w-6 text-purple-400" /> Reward Auctions
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Bid points on exclusive rewards. Highest bidder wins when time expires.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-yellow-800/40 bg-yellow-900/20 px-4 py-3 text-sm">
        <Trophy className="h-4 w-4 text-yellow-400 shrink-0" />
        <span className="text-yellow-300 font-semibold">{myPoints.toLocaleString()} pts</span>
        <span className="text-slate-400">available to bid</span>
      </div>

      {/* Active auctions */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Live Auctions</h2>
        {activeAuctions.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="flex flex-col items-center py-12 gap-3">
              <Gavel className="h-8 w-8 text-slate-600" />
              <p className="text-slate-400 text-sm">No active auctions right now. Check back soon.</p>
            </CardContent>
          </Card>
        ) : (
          activeAuctions.map((auction) => {
            const topBid = auction.bids[0]
            const myBid = auction.bids.find((b) => b.user.id === user.id)
            const isLeading = topBid?.user.id === user.id
            const minNext = (topBid?.points ?? auction.minBid - 1) + 1
            const timeLeft = formatDistanceToNow(auction.endTime, { addSuffix: true })

            return (
              <Card key={auction.id} className={`bg-slate-800 border-2 ${isLeading ? 'border-green-700' : 'border-slate-700'}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-white text-base">{auction.reward.title}</CardTitle>
                    <div className="flex items-center gap-1.5 text-xs text-orange-300 shrink-0">
                      <Clock className="h-3.5 w-3.5" />
                      {timeLeft}
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs line-clamp-2">{auction.reward.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current bids */}
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Top bids</p>
                    {auction.bids.length === 0 ? (
                      <p className="text-xs text-slate-500">No bids yet. Minimum: {auction.minBid} pts</p>
                    ) : (
                      <div className="space-y-1">
                        {auction.bids.map((bid, i) => (
                          <div key={bid.id} className={`flex items-center justify-between text-sm ${i === 0 ? 'text-white' : 'text-slate-400'}`}>
                            <span>{i === 0 && '👑 '}{bid.user.id === user.id ? 'You' : bid.user.name}</span>
                            <span className={i === 0 ? 'font-bold text-yellow-400' : ''}>{bid.points} pts</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bid form */}
                  {myPoints >= minNext ? (
                    <form
                      action={async (fd) => {
                        'use server'
                        await placeBid(auction.id, parseInt(fd.get('points') as string))
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="number"
                        name="points"
                        defaultValue={minNext}
                        min={minNext}
                        max={myPoints}
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 transition-colors shrink-0"
                      >
                        {isLeading ? 'Raise Bid' : 'Place Bid'}
                      </button>
                    </form>
                  ) : (
                    <p className="text-xs text-slate-500">
                      {myPoints < auction.minBid ? 'Not enough points to bid' : `Need ${minNext} pts to outbid`}
                    </p>
                  )}

                  {isLeading && (
                    <p className="text-xs text-green-400 font-medium">✓ You are currently winning this auction</p>
                  )}
                  {myBid && !isLeading && (
                    <p className="text-xs text-red-400">⚠️ You've been outbid! Raise your bid to stay in.</p>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Past auctions */}
      {endedAuctions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Past Auctions</h2>
          <div className="divide-y divide-slate-700 rounded-xl border border-slate-700 bg-slate-800/40 overflow-hidden">
            {endedAuctions.map((auction) => (
              <div key={auction.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-slate-300 font-medium">{auction.reward.title}</span>
                <div className="text-right">
                  {auction.winner ? (
                    <p className="text-xs text-slate-400">
                      Won by <span className={auction.winner.id === user.id ? 'text-green-400 font-semibold' : 'text-white'}>
                        {auction.winner.id === user.id ? 'You' : auction.winner.name}
                      </span> · {auction.bids[0]?.points ?? '?'} pts
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">No winner</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link href="/app/rewards" className="text-sm text-slate-400 hover:text-white transition-colors">
        ← Back to Rewards Catalog
      </Link>
    </div>
  )
}
