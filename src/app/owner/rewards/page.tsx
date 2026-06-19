import { requireOwner } from '@/lib/owner-auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Gift, Gavel, Ticket, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Rewards | Owner Console' }

export default async function OwnerRewardsPage() {
  await requireOwner()

  const [
    totalRewards,
    rewardsByCategory,
    totalRedemptions,
    pointsRedeemed,
    pendingRedemptions,
    usedRedemptions,
    topRedeemedRewards,
    activeAuctions,
    pastAuctions,
    auctionBidStats,
    totalAuctionPointsBid,
  ] = await Promise.all([
    prisma.reward.count(),
    prisma.reward.groupBy({ by: ['category'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
    prisma.rewardRedemption.count(),
    prisma.rewardRedemption.aggregate({ _sum: { pointsSpent: true } }),
    prisma.rewardRedemption.count({ where: { status: 'PENDING' } }),
    prisma.rewardRedemption.count({ where: { status: 'USED' } }),
    prisma.rewardRedemption.groupBy({
      by: ['rewardId'],
      _count: { id: true },
      _sum: { pointsSpent: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
    prisma.rewardAuction.findMany({
      where: { isSettled: false, endTime: { gte: new Date() } },
      orderBy: { endTime: 'asc' },
      include: {
        reward: { select: { title: true, category: true, pointsCost: true } },
        _count: { select: { bids: true } },
        bids: { orderBy: { points: 'desc' }, take: 1, select: { points: true, user: { select: { name: true } } } },
      },
    }),
    prisma.rewardAuction.findMany({
      where: { isSettled: true },
      orderBy: { endTime: 'desc' },
      take: 8,
      include: {
        reward: { select: { title: true } },
        winner: { select: { name: true } },
        bids: { orderBy: { points: 'desc' }, take: 1, select: { points: true } },
      },
    }),
    prisma.auctionBid.aggregate({ _count: { id: true } }),
    prisma.auctionBid.aggregate({ _sum: { points: true } }),
  ])

  const rewardIds = topRedeemedRewards.map((r) => r.rewardId)
  const rewardDetails = await prisma.reward.findMany({
    where: { id: { in: rewardIds } },
    select: { id: true, title: true, category: true, pointsCost: true },
  })
  const rewardMap = Object.fromEntries(rewardDetails.map((r) => [r.id, r]))

  const CATEGORY_EMOJI: Record<string, string> = {
    DISCOUNT: '🏷️', MERCHANDISE: '👕', FREE_SESSION: '🎟️',
    FOOD_DRINK: '🍔', TOURNAMENT_ENTRY: '🏆', SPONSOR_VOUCHER: '💳', VIP_ACCESS: '⭐',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Gift className="h-6 w-6 text-rose-400" />
        <h1 className="text-2xl font-bold text-white">Rewards Overview</h1>
      </div>

      {/* Summary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Rewards in Catalog', value: totalRewards, color: 'text-rose-400' },
          { label: 'Total Redemptions', value: totalRedemptions, color: 'text-amber-400' },
          { label: 'Points Redeemed', value: (pointsRedeemed._sum.pointsSpent ?? 0).toLocaleString(), color: 'text-red-400' },
          { label: 'Active Auctions', value: activeAuctions.length, color: 'text-purple-400' },
        ].map((k) => (
          <Card key={k.label} className="bg-slate-900 border-slate-800">
            <CardContent className="pt-5">
              <p className="text-xs text-slate-500 uppercase tracking-wide">{k.label}</p>
              <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Redemption status */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Pending Redemptions', value: pendingRedemptions, color: 'text-yellow-400', border: 'border-yellow-800/30' },
          { label: 'Used Redemptions', value: usedRedemptions, color: 'text-green-400', border: 'border-green-800/30' },
          { label: 'Total Auction Bids', value: auctionBidStats._count.id, color: 'text-purple-400', border: 'border-purple-800/30' },
        ].map((s) => (
          <Card key={s.label} className={`bg-slate-900 border ${s.border}`}>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Reward categories */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Rewards by Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rewardsByCategory.map((c) => (
              <div key={c.category} className="flex items-center justify-between rounded-lg bg-slate-800/40 px-3 py-2">
                <span className="text-sm text-white">{CATEGORY_EMOJI[c.category] ?? '🎁'} {c.category.replace(/_/g, ' ')}</span>
                <span className="text-sm font-bold text-amber-400">{c._count.id}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top redeemed rewards */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Ticket className="h-4 w-4 text-amber-400" /> Top Redeemed Rewards
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topRedeemedRewards.map((r, i) => {
              const reward = rewardMap[r.rewardId]
              return (
                <div key={r.rewardId} className="flex items-center gap-3 rounded-lg bg-slate-800/40 px-3 py-2">
                  <span className="text-xs font-bold text-slate-500 w-4">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{reward?.title ?? r.rewardId}</p>
                    <p className="text-xs text-slate-500">{reward?.category ?? '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-400">{r._count.id}×</p>
                    <p className="text-xs text-slate-500">{(r._sum.pointsSpent ?? 0).toLocaleString()} pts</p>
                  </div>
                </div>
              )
            })}
            {topRedeemedRewards.length === 0 && <p className="text-slate-500 text-sm">No redemptions yet</p>}
          </CardContent>
        </Card>
      </div>

      {/* Active auctions */}
      {activeAuctions.length > 0 && (
        <Card className="bg-slate-900 border-purple-800/30">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Gavel className="h-4 w-4 text-purple-400" /> Live Auctions ({activeAuctions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeAuctions.map((a) => {
              const topBid = a.bids[0]
              const timeLeft = new Date(a.endTime).getTime() - Date.now()
              const hoursLeft = Math.max(0, Math.floor(timeLeft / 3600000))
              return (
                <div key={a.id} className="flex items-center gap-4 rounded-lg bg-slate-800/40 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{a.reward.title}</p>
                    <p className="text-xs text-slate-400">{a.reward.category.replace(/_/g, ' ')} · Catalog: {a.reward.pointsCost} pts</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-purple-400">
                      {topBid ? `${topBid.points} pts` : 'No bids'}
                    </p>
                    <p className="text-xs text-slate-500">{a._count.bids} bids · {hoursLeft}h left</p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Past auctions */}
      {pastAuctions.length > 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Past Auctions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pastAuctions.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg bg-slate-800/40 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{a.reward.title}</p>
                  <p className="text-xs text-slate-500">Won by {a.winner?.name ?? '—'}</p>
                </div>
                <p className="text-sm font-bold text-amber-400 shrink-0">
                  {a.bids[0]?.points.toLocaleString() ?? '—'} pts
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick links to admin reward management */}
      <div className="flex gap-3 flex-wrap">
        <Link href="/admin/rewards" className="rounded-lg bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 text-sm font-medium transition-colors border border-slate-700">
          Manage Reward Catalog →
        </Link>
        <Link href="/admin/rewards/auctions" className="rounded-lg bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 text-sm font-medium transition-colors border border-slate-700">
          Manage Auctions →
        </Link>
        <Link href="/admin/redemptions" className="rounded-lg bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 text-sm font-medium transition-colors border border-slate-700">
          Process Redemptions →
        </Link>
      </div>
    </div>
  )
}
