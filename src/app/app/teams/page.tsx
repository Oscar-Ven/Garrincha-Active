import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Plus, MapPin } from 'lucide-react'

export const metadata = { title: 'Teams' }

export default async function TeamsPage() {
  const session = await getCurrentUser()
  if (!session) redirect('/login')

  const teams = await prisma.team.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { members: true } },
      members: {
        where: { userId: session.id },
        select: { id: true, role: true },
      },
    },
  })

  async function joinTeam(teamId: string) {
    'use server'
    const user = await getCurrentUser()
    if (!user) return
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId, userId: user.id } },
      update: {},
      create: { teamId, userId: user.id, role: 'MEMBER' },
    })
    redirect('/app/teams')
  }

  async function leaveTeam(teamId: string) {
    'use server'
    const user = await getCurrentUser()
    if (!user) return
    await prisma.teamMember.deleteMany({ where: { teamId, userId: user.id } })
    redirect('/app/teams')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="h-6 w-6 text-purple-400" /> Teams &amp; Clubs
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => {
          const isMember = team.members.length > 0
          const memberRole = team.members[0]?.role
          return (
            <Card key={team.id} className="bg-slate-800 border-slate-700">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-900/50 flex items-center justify-center text-lg font-bold text-purple-300">
                    {team.name[0]}
                  </div>
                  {isMember && (
                    <span className="text-xs rounded-full bg-purple-900/40 text-purple-300 px-2 py-0.5 font-medium">
                      {memberRole === 'OWNER' ? '👑 Owner' : memberRole === 'ADMIN' ? '⭐ Admin' : '✓ Member'}
                    </span>
                  )}
                </div>
                <Link href={`/app/teams/${team.id}`} className="hover:text-green-400 transition-colors">
                  <h3 className="font-semibold text-white mb-1">{team.name}</h3>
                </Link>
                {team.description && (
                  <p className="text-slate-400 text-xs mb-2 line-clamp-2">{team.description}</p>
                )}
                <p className="text-xs text-slate-500 mb-4">{team._count.members} members</p>
                <div className="flex gap-2">
                  {isMember ? (
                    <form action={leaveTeam.bind(null, team.id)} className="flex-1">
                      <button
                        type="submit"
                        className="w-full text-xs rounded-lg border border-slate-600 text-slate-400 py-1.5 hover:bg-slate-700 transition-colors"
                      >
                        Leave
                      </button>
                    </form>
                  ) : (
                    <form action={joinTeam.bind(null, team.id)} className="flex-1">
                      <button
                        type="submit"
                        className="w-full text-xs rounded-lg bg-purple-700 text-white py-1.5 hover:bg-purple-600 transition-colors font-medium"
                      >
                        Join Team
                      </button>
                    </form>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {teams.length === 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 mx-auto text-slate-500 mb-3" />
            <p className="text-slate-400">No teams available yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}