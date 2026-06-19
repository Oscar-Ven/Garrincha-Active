import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Gavel, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDistanceToNow, isPast } from 'date-fns'

export const metadata = { title: 'Auctions — Admin' }

async function createAuction(formData: FormData) {
  'use server'
  const user = await getCurrentUser()
  if (!user || (user.role !== 'PLATFORM_ADMIN' && user.role !== 'CENTER_ADMIN')) redirect('/login')

  const rewardId = formData.get('rewardId') as string
  const startTime = new Date(formData.get('startTime') as string)
  const endTime = new Date(formData.get('endTime') as string)
  const minBid = parseInt(formData.get('minBid') as string)

  if (!rewardId || isNaN(startTime.getTime()) || isNaN(endTime.getTime()) || isNaN(minBid)) return

  await prisma.rewardAuction.create({
    data: { rewardId, startTime, endTime, minBid, isSettled: false },
  })

  revalidatePath('/admin/rewards/auctions')
}

async function settleAuction(auctionId: string) {
  'use server'
  const user = await getCurrentUser()
  if (!user || (user.role !== 'PLATFORM_ADMIN' && user.role !== 'CENTER_ADMIN')) redirect('/login')

  const auction = await prisma.rewardAuction.findUnique({
    where: { id: auctionId },
    include: { bids: { orderBy: { points: 'desc' }, take: 1 }, reward: true },
  })
  if (!auction || auction.isSettled) return

  const winner = auction.bids[0]
  if (winner) {
    await prisma.$transaction([
      prisma.rewardAuction.update({ where: { id: auctionId }, data: { isSettled: true, winnerId: winner.userId } }),
      prisma.playerProfile.update({ where: { userId: winner.userId }, data: { totalPoints: { decrement: winner.points } } }),
      prisma.pointsLedger.create({ data: { userId: winner.userId, sourceType: 'REDEMPTION_DEBIT', points: -winner.points, reason: `Won auction: ${auction.reward.title}` } }),
      prisma.notification.create({ data: { userId: winner.userId, type: 'AUCTION_WON', title: '🎉 You won the auction!', body: `You won "${auction.reward.title}" for ${winner.points} pts`, linkUrl: '/app/rewards/auctions' } }),
    ])
  } else {
    await prisma.rewardAuction.update({ where: { id: auctionId }, data: { isSettled: true } })
  }

  revalidatePath('/admin/rewards/auctions')
}

export default async function AdminAuctionsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'PLATFORM_ADMIN' && user.role !== 'CENTER_ADMIN') redirect('/admin')

  const now = new Date()
  const [auctions, rewards] = await Promise.all([
    prisma.rewardAuction.findMany({
      include: {
        reward: { select: { title: true } },
        bids: { orderBy: { points: 'desc' }, include: { user: { select: { name: true } } }, take: 3 },
        winner: { select: { name: true } },
      },
      orderBy: { endTime: 'desc' },
    }),
    prisma.reward.findMany({ where: { isActive: true }, select: { id: true, title: true }, orderBy: { title: 'asc' } }),
  ])

  const active = auctions.filter((a) => !a.isSettled && !isPast(a.endTime))
  const ended = auctions.filter((a) => a.isSettled || isPast(a.endTime))

  const nowStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gavel className="h-6 w-6 text-purple-400" /> Reward Auctions
          </h1>
          <p className="text-slate-400 text-sm mt-1">Create and manage point-based auctions for exclusive rewards.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Auctions', value: auctions.length, color: 'text-white' },
          { label: 'Live Now', value: active.length, color: 'text-green-400' },
          { label: 'Settled', value: ended.filter((a) => a.isSettled).length, color: 'text-purple-400' },
        ].map((s) => (
          <Card key={s.label} className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create form */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Plus className="h-4 w-4" /> Create New Auction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAuction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-400">Reward</label>
              <select name="rewardId" required className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-600">
                <option value="">Select a reward…</option>
                {rewards.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Minimum Bid (pts)</label>
              <input type="number" name="minBid" defaultValue={50} min={1} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-600" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 opacity-0">.</label>
              <button type="submit" className="w-full rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2 transition-colors">
                Create Auction
              </button>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Start Time</label>
              <input type="datetime-local" name="startTime" defaultValue={nowStr} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-600 [color-scheme:dark]" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">End Time</label>
              <input type="datetime-local" name="endTime" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-600 [color-scheme:dark]" />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Auction list */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-0">
          <CardTitle className="text-white text-base">All Auctions</CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  {['Reward', 'Min Bid', 'Top Bid', 'Ends', 'Status', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {auctions.map((a) => {
                  const isLive = !a.isSettled && !isPast(a.endTime)
                  const topBid = a.bids[0]
                  return (
                    <tr key={a.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{a.reward.title}</td>
                      <td className="px-4 py-3 text-slate-300">{a.minBid} pts</td>
                      <td className="px-4 py-3">
                        {topBid ? (
                          <span className="text-yellow-400 font-semibold">{topBid.points} pts <span className="text-slate-400 font-normal text-xs">({topBid.user.name})</span></span>
                        ) : (
                          <span className="text-slate-500">No bids</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-xs">
                        {formatDistanceToNow(a.endTime, { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          a.isSettled ? 'bg-purple-900/40 text-purple-300' :
                          isLive ? 'bg-green-900/40 text-green-300' :
                          'bg-yellow-900/40 text-yellow-300'
                        }`}>
                          {a.isSettled ? 'Settled' : isLive ? 'Live' : 'Ended'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {!a.isSettled && isPast(a.endTime) && (
                          <form action={settleAuction.bind(null, a.id)}>
                            <button type="submit" className="rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-xs font-semibold px-3 py-1.5 transition-colors">
                              Settle
                            </button>
                          </form>
                        )}
                        {a.isSettled && a.winner && (
                          <span className="text-xs text-slate-400">Won by {a.winner.name}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {auctions.length === 0 && (
              <div className="flex flex-col items-center py-12 text-slate-500 gap-2">
                <Gavel className="h-8 w-8 opacity-40" />
                <p className="text-sm">No auctions yet. Create one above.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
