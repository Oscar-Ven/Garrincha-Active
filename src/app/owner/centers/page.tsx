import { requireOwner } from '@/lib/owner-auth'
import { prisma } from '@/lib/db'
import { Building2, Users, Activity, Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Centers | Owner Console' }

export default async function OwnerCentersPage() {
  await requireOwner()

  const centers = await prisma.center.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { players: true, events: true, challenges: true, teams: true, segments: true },
      },
      players: {
        select: {
          playerProfile: { select: { totalPoints: true, totalActivities: true } },
          _count: { select: { activities: true } },
        },
      },
    },
  })

  const centersWithStats = centers.map((c) => {
    const totalPoints = c.players.reduce((s, p) => s + (p.playerProfile?.totalPoints ?? 0), 0)
    const totalActivities = c.players.reduce((s, p) => s + p._count.activities, 0)
    const avgPoints = c._count.players > 0 ? Math.round(totalPoints / c._count.players) : 0
    return { ...c, totalPoints, totalActivities, avgPoints }
  })

  const sortedByActivity = [...centersWithStats].sort((a, b) => b.totalActivities - a.totalActivities)
  const sortedByPoints = [...centersWithStats].sort((a, b) => b.totalPoints - a.totalPoints)

  const totalCenters = centers.length
  const activeCenters = centers.filter((c) => c.isActive).length
  const totalMembers = centers.reduce((s, c) => s + c._count.players, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Building2 className="h-6 w-6 text-purple-400" />
        <h1 className="text-2xl font-bold text-white">Centers</h1>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Centers', value: totalCenters, sub: `${activeCenters} active`, color: 'text-purple-400' },
          { label: 'Total Members', value: totalMembers.toLocaleString(), sub: 'across all centers', color: 'text-blue-400' },
          { label: 'Avg Members/Center', value: totalCenters > 0 ? (totalMembers / totalCenters).toFixed(1) : '0', sub: 'per center', color: 'text-amber-400' },
        ].map((s) => (
          <Card key={s.label} className="bg-slate-900 border-slate-800">
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-600">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Full centers table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-base">All Centers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Center</th>
                  <th className="px-4 py-3 text-left">City</th>
                  <th className="px-4 py-3 text-right">Members</th>
                  <th className="px-4 py-3 text-right">Activities</th>
                  <th className="px-4 py-3 text-right">Total Points</th>
                  <th className="px-4 py-3 text-right">Avg pts/member</th>
                  <th className="px-4 py-3 text-right">Events</th>
                  <th className="px-4 py-3 text-right">Challenges</th>
                  <th className="px-4 py-3 text-right">Teams</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {centersWithStats.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{c.name}</p>
                      {c.email && <p className="text-xs text-slate-500">{c.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{c.city ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-white font-mono">{c._count.players}</td>
                    <td className="px-4 py-3 text-right text-green-400 font-mono">{c.totalActivities}</td>
                    <td className="px-4 py-3 text-right text-amber-400 font-mono">{c.totalPoints.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-300 font-mono">{c.avgPoints.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-400 font-mono">{c._count.events}</td>
                    <td className="px-4 py-3 text-right text-slate-400 font-mono">{c._count.challenges}</td>
                    <td className="px-4 py-3 text-right text-slate-400 font-mono">{c._count.teams}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${c.isActive ? 'text-green-400' : 'text-red-400'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
                {centersWithStats.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500">No centers yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Rankings */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-400" /> Most Active Centers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedByActivity.slice(0, 5).map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500 w-4">#{i + 1}</span>
                <p className="flex-1 text-sm text-white truncate">{c.name}</p>
                <p className="text-sm font-bold text-green-400">{c.totalActivities}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" /> Highest Scoring Centers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedByPoints.slice(0, 5).map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500 w-4">#{i + 1}</span>
                <p className="flex-1 text-sm text-white truncate">{c.name}</p>
                <p className="text-sm font-bold text-amber-400">{c.totalPoints.toLocaleString()} pts</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
