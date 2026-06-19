import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { DirectChallengeType } from '@/generated/prisma'
import { Users, Target, Trophy, Plus, Bell } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const team = await prisma.team.findUnique({ where: { id }, select: { name: true } })
  return { title: team ? `${team.name} | Garrincha Active` : 'Team' }
}

const TYPE_LABELS: Record<DirectChallengeType, string> = {
  DISTANCE: 'km total distance',
  ACTIVITY_COUNT: 'total activities',
  ACTIVE_MINUTES: 'total active minutes',
}

async function createSquadGoal(teamId: string, formData: FormData) {
  'use server'
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: user.id } },
  })
  if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) return

  const title = (formData.get('title') as string)?.trim()
  const type = formData.get('type') as DirectChallengeType
  const targetValue = parseFloat(formData.get('targetValue') as string)
  const endDate = new Date(formData.get('endDate') as string)

  if (!title || !type || isNaN(targetValue) || isNaN(endDate.getTime())) return

  await prisma.squadGoal.create({
    data: {
      teamId,
      title,
      type,
      targetValue,
      currentValue: 0,
      startDate: new Date(),
      endDate,
      isActive: true,
    },
  })

  revalidatePath(`/app/teams/${teamId}`)
}

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, nickname: true, avatarUrl: true, playerProfile: { select: { totalPoints: true, totalDistance: true } } } } },
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      },
      center: { select: { name: true } },
      squadGoals: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      },
      announcements: {
        include: { author: { select: { id: true, name: true, nickname: true } } },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      },
    },
  })

  if (!team) notFound()

  const myMembership = team.members.find((m) => m.userId === user.id)
  const isAdmin = myMembership?.role === 'OWNER' || myMembership?.role === 'ADMIN'

  const totalPoints = team.members.reduce((s, m) => s + (m.user.playerProfile?.totalPoints ?? 0), 0)
  const totalDistance = team.members.reduce((s, m) => s + (m.user.playerProfile?.totalDistance ?? 0), 0)

  const roleOrder = { OWNER: 0, ADMIN: 1, MEMBER: 2 }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-400" /> {team.name}
          </h1>
          {team.center && <p className="text-slate-400 text-sm mt-1">📍 {team.center.name}</p>}
          {team.description && <p className="text-slate-300 text-sm mt-1">{team.description}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-yellow-400">{totalPoints.toLocaleString()}</p>
          <p className="text-xs text-slate-400">combined pts</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{team.members.length}</p>
            <p className="text-xs text-slate-400">Members</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{totalDistance.toFixed(1)}</p>
            <p className="text-xs text-slate-400">km total</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{team.squadGoals.filter((g) => g.isActive).length}</p>
            <p className="text-xs text-slate-400">Active goals</p>
          </CardContent>
        </Card>
      </div>

      {/* Announcements */}
      {(team.announcements.length > 0 || isAdmin) && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-400" /> Announcements
            </CardTitle>
            {isAdmin && (
              <Link
                href={`/app/teams/${id}/announcements/new`}
                className="rounded-lg bg-blue-600/20 border border-blue-600/30 px-3 py-1 text-xs font-medium text-blue-400 hover:bg-blue-600/30 transition-colors"
              >
                + Post
              </Link>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {team.announcements.length === 0 ? (
              <p className="text-slate-500 text-sm">No announcements yet.</p>
            ) : (
              team.announcements.map((a) => (
                <div
                  key={a.id}
                  className={`rounded-xl border p-4 ${a.isPinned ? 'border-blue-600/30 bg-blue-600/10' : 'border-slate-700 bg-slate-700/30'}`}
                >
                  <div className="flex items-start gap-2">
                    {a.isPinned && <span className="mt-0.5 text-xs text-blue-400">📌</span>}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{a.title}</p>
                      <p className="mt-1 text-sm text-slate-300 whitespace-pre-wrap">{a.content}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {a.author.name} · {new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Squad Goals */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-orange-400" /> Squad Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {team.squadGoals.length === 0 ? (
            <p className="text-slate-500 text-sm">No squad goals yet.{isAdmin && ' Create one below!'}</p>
          ) : (
            team.squadGoals.map((goal) => {
              const pct = Math.min(100, (goal.currentValue / goal.targetValue) * 100)
              const ended = new Date() > goal.endDate
              return (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-white text-sm font-medium">{goal.title}</p>
                    {ended && <span className="text-xs text-slate-500">Ended</span>}
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-700">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-yellow-500' : 'bg-orange-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{goal.currentValue.toFixed(1)} / {goal.targetValue} {TYPE_LABELS[goal.type]}</span>
                    <span>{pct >= 100 ? '✅ Complete!' : `${pct.toFixed(0)}%`}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Ends {goal.endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              )
            })
          )}

          {/* Create goal form — admins only */}
          {isAdmin && (
            <form action={createSquadGoal.bind(null, id)} className="border-t border-slate-700 pt-4 space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">New Squad Goal</p>
              <input
                name="title"
                placeholder="Goal title (e.g. 100km this month)"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-600"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  name="type"
                  defaultValue="DISTANCE"
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-600"
                >
                  <option value="DISTANCE">Distance (km)</option>
                  <option value="ACTIVITY_COUNT">Activity Count</option>
                  <option value="ACTIVE_MINUTES">Active Minutes</option>
                </select>
                <input
                  name="targetValue"
                  type="number"
                  placeholder="Target"
                  min={1}
                  step={0.5}
                  required
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
              </div>
              <input
                name="endDate"
                type="date"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-600 [color-scheme:dark]"
              />
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold px-4 py-2 transition-colors"
              >
                <Plus className="h-4 w-4" /> Create Goal
              </button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Members */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base">Members</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-700/50">
          {team.members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-3">
              <div className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                {m.user.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/app/players/${m.user.id}`} className="text-white text-sm font-medium hover:text-green-400 transition-colors">
                  {m.user.name}
                </Link>
                <p className="text-xs text-slate-500">@{m.user.nickname}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-semibold text-yellow-400">{(m.user.playerProfile?.totalPoints ?? 0).toLocaleString()} pts</p>
                <p className={`text-xs font-medium ${m.role === 'OWNER' ? 'text-orange-400' : m.role === 'ADMIN' ? 'text-blue-400' : 'text-slate-500'}`}>
                  {m.role}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Link href="/app/teams" className="text-sm text-slate-400 hover:text-white transition-colors">
        ← Back to Teams
      </Link>
    </div>
  )
}
