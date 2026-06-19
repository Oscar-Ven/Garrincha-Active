import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Building2, TrendingUp, Leaf } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Center League | Garrincha Active' }

async function getCenterLeague(period: 'week' | 'month' | 'all') {
  const now = new Date()
  const cutoff =
    period === 'week'
      ? new Date(now.getTime() - 7 * 86_400_000)
      : period === 'month'
      ? new Date(now.getTime() - 30 * 86_400_000)
      : new Date(0)

  const centers = await prisma.center.findMany({
    where: { isActive: true },
    include: {
      players: {
        select: {
          playerProfile: { select: { totalPoints: true, totalDistance: true, carbonSavedKg: true } },
          activities: {
            where: { status: 'APPROVED', startedAt: { gte: cutoff } },
            select: { pointsEarned: true, distanceKm: true, durationMinutes: true },
          },
          _count: { select: { activities: true } },
        },
      },
    },
  })

  const ranked = centers
    .map((c) => {
      const periodPoints = c.players.reduce(
        (s, p) => s + p.activities.reduce((as, a) => as + a.pointsEarned, 0),
        0,
      )
      const periodDistance = c.players.reduce(
        (s, p) => s + p.activities.reduce((as, a) => as + (a.distanceKm ?? 0), 0),
        0,
      )
      const periodActivities = c.players.reduce((s, p) => s + p.activities.length, 0)
      const totalCarbonSaved = c.players.reduce(
        (s, p) => s + (p.playerProfile?.carbonSavedKg ?? 0),
        0,
      )
      const playerCount = c.players.filter((p) => p.playerProfile).length

      return {
        id: c.id,
        name: c.name,
        city: c.city,
        playerCount,
        periodPoints,
        periodDistance,
        periodActivities,
        totalCarbonSaved,
      }
    })
    .sort((a, b) => b.periodPoints - a.periodPoints)
    .map((c, i) => ({ ...c, rank: i + 1 }))

  return ranked
}

const RANK_ICONS = ['🥇', '🥈', '🥉']
const ZONE_LABELS = {
  promotion: 'bg-green-900/40 text-green-300 border-green-800/40',
  midtable: 'bg-slate-800 border-slate-700',
  relegation: 'bg-red-950/20 border-red-900/30',
}

export default async function CenterLeaguePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { period: rawPeriod } = await searchParams
  const period = rawPeriod === 'month' ? 'month' : rawPeriod === 'all' ? 'all' : 'week'

  const [league, userCenter] = await Promise.all([
    getCenterLeague(period),
    prisma.user.findUnique({ where: { id: user.id }, select: { centerId: true } }),
  ])

  const top3 = Math.ceil(league.length * 0.25)
  const bottom3 = Math.floor(league.length * 0.75)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Building2 className="h-6 w-6 text-blue-400" /> Center League Table
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Centers ranked by collective player activity — updated in real time.
        </p>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 rounded-lg border border-slate-700 bg-slate-800 p-1 w-fit">
        {(['week', 'month', 'all'] as const).map((p) => (
          <Link
            key={p}
            href={`/app/leaderboards/centers?period=${p}`}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              period === p ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
          </Link>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-green-600" /><span className="text-slate-400">Promotion zone (top 25%)</span></div>
        <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-red-700" /><span className="text-slate-400">Relegation zone (bottom 25%)</span></div>
        <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-yellow-500" /><span className="text-slate-400">Your center</span></div>
      </div>

      {/* Table */}
      <Card className="bg-slate-800 border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 w-12">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Center</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400 hidden sm:table-cell">Players</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Activities</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400 hidden md:table-cell">Distance</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Points</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400 hidden lg:table-cell">
                  <span className="flex items-center justify-end gap-1"><Leaf className="h-3 w-3 text-green-400" />CO₂</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {league.map((center) => {
                const isUser = center.id === userCenter?.centerId
                const zone = center.rank <= top3 ? 'promotion' : center.rank > bottom3 ? 'relegation' : 'midtable'
                return (
                  <tr
                    key={center.id}
                    className={`transition-colors ${
                      isUser
                        ? 'bg-yellow-900/20 border-l-2 border-l-yellow-500'
                        : zone === 'promotion'
                        ? 'border-l-2 border-l-green-700'
                        : zone === 'relegation'
                        ? 'border-l-2 border-l-red-800'
                        : ''
                    } hover:bg-slate-700/30`}
                  >
                    <td className="px-4 py-3">
                      <span className="text-lg">{RANK_ICONS[center.rank - 1] ?? center.rank}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`font-semibold ${isUser ? 'text-yellow-300' : 'text-white'}`}>{center.name}</p>
                      {center.city && <p className="text-xs text-slate-500">{center.city}</p>}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300 hidden sm:table-cell">{center.playerCount}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{center.periodActivities}</td>
                    <td className="px-4 py-3 text-right text-slate-300 hidden md:table-cell">{center.periodDistance.toFixed(1)} km</td>
                    <td className="px-4 py-3 text-right font-bold text-yellow-400">{center.periodPoints.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-green-400 hidden lg:table-cell">{center.totalCarbonSaved.toFixed(1)} kg</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Link href="/app/leaderboards" className="text-sm text-slate-400 hover:text-white transition-colors">
        ← Back to Leaderboards
      </Link>
    </div>
  )
}
