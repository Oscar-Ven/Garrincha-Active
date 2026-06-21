import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

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

const RANK_SYMBOLS = ['emoji_events', 'workspace_premium', 'military_tech']

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
    <div className="space-y-lg">
      <div>
        <h1 className="text-headline-md font-black italic tracking-tight text-primary-fixed flex items-center gap-sm">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '28px', fontVariationSettings: "'FILL' 1" }}
          >
            location_city
          </span>
          Center League Table
        </h1>
        <p className="text-label-caps text-on-surface-variant mt-xs">
          Centers ranked by collective player activity — updated in real time.
        </p>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 glass-card rounded-xl p-1 w-fit">
        {(['week', 'month', 'all'] as const).map((p) => (
          <Link
            key={p}
            href={`/app/leaderboards/centers?period=${p}`}
            className={`rounded-lg px-md py-xs text-label-caps font-bold transition-colors ${
              period === p
                ? 'bg-primary-fixed text-on-primary-fixed'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
          </Link>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-md text-label-caps text-on-surface-variant">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-primary-fixed" />
          <span>Promotion zone (top 25%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-error" />
          <span>Relegation zone (bottom 25%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[#FFD700]" />
          <span>Your center</span>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-md py-sm text-left text-label-caps text-on-surface-variant w-12">#</th>
                <th className="px-md py-sm text-left text-label-caps text-on-surface-variant">Center</th>
                <th className="px-sm py-sm text-right text-label-caps text-on-surface-variant hidden sm:table-cell">Players</th>
                <th className="px-sm py-sm text-right text-label-caps text-on-surface-variant">Activities</th>
                <th className="px-sm py-sm text-right text-label-caps text-on-surface-variant hidden md:table-cell">Distance</th>
                <th className="px-sm py-sm text-right text-label-caps text-on-surface-variant">Points</th>
                <th className="px-md py-sm text-right text-label-caps text-on-surface-variant hidden lg:table-cell">
                  <span className="flex items-center justify-end gap-1">
                    <span className="material-symbols-outlined text-primary-fixed" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>eco</span>
                    CO₂
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {league.map((center) => {
                const isUser = center.id === userCenter?.centerId
                const zone = center.rank <= top3 ? 'promotion' : center.rank > bottom3 ? 'relegation' : 'midtable'
                return (
                  <tr
                    key={center.id}
                    className={`transition-colors hover:bg-surface-container-high ${
                      isUser
                        ? 'bg-[#FFD700]/5 border-l-2 border-l-[#FFD700]'
                        : zone === 'promotion'
                        ? 'border-l-2 border-l-primary-fixed'
                        : zone === 'relegation'
                        ? 'border-l-2 border-l-error'
                        : ''
                    }`}
                  >
                    <td className="px-md py-sm">
                      {RANK_SYMBOLS[center.rank - 1] ? (
                        <span
                          className="material-symbols-outlined text-[#FFD700]"
                          style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
                        >
                          {RANK_SYMBOLS[center.rank - 1]}
                        </span>
                      ) : (
                        <span className="text-label-caps font-bold text-on-surface-variant">{center.rank}</span>
                      )}
                    </td>
                    <td className="px-md py-sm">
                      <p className={`font-bold ${isUser ? 'text-[#FFD700]' : 'text-on-surface'}`}>{center.name}</p>
                      {center.city && <p className="text-label-caps text-on-surface-variant">{center.city}</p>}
                    </td>
                    <td className="px-sm py-sm text-right text-on-surface hidden sm:table-cell">{center.playerCount}</td>
                    <td className="px-sm py-sm text-right text-on-surface">{center.periodActivities}</td>
                    <td className="px-sm py-sm text-right text-on-surface hidden md:table-cell">{center.periodDistance.toFixed(1)} km</td>
                    <td className="px-sm py-sm text-right font-bold text-[#FFD700]">{center.periodPoints.toLocaleString()}</td>
                    <td className="px-md py-sm text-right text-primary-fixed hidden lg:table-cell">{center.totalCarbonSaved.toFixed(1)} kg</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Link href="/app/leaderboards" className="text-label-caps text-on-surface-variant hover:text-on-surface transition-colors">
        ← Back to Leaderboards
      </Link>
    </div>
  )
}
