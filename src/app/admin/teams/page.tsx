import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TeamsTable, type TeamRow } from './teams-table'

export const metadata: Metadata = {
  title: 'Teams | Garrincha Admin',
  description: 'Manage all teams on the platform.',
}

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getTeams(): Promise<TeamRow[]> {
  const teams = await prisma.team.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    include: {
      _count: { select: { members: true } },
      members: {
        orderBy: { joinedAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              nickname: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  })

  // Resolve center info: Team has centerId but Center has no back-relation to teams.
  const centerIds = [...new Set(teams.map((t) => t.centerId).filter(Boolean) as string[])]
  const centers =
    centerIds.length > 0
      ? await prisma.center.findMany({
          where: { id: { in: centerIds } },
          select: { id: true, name: true, city: true },
        })
      : []

  const centerMap = new Map(centers.map((c) => [c.id, c]))

  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    imageUrl: t.imageUrl,
    isActive: t.isActive,
    createdAt: t.createdAt.toISOString(),
    center: t.centerId ? (centerMap.get(t.centerId) ?? null) : null,
    membersCount: t._count.members,
    members: t.members.map((m) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
      user: m.user,
    })),
  }))
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-slate-700/60 bg-slate-800/40 px-5 py-4">
      <span
        className={
          accent
            ? 'text-2xl font-bold text-green-400'
            : 'text-2xl font-bold text-white'
        }
      >
        {value}
      </span>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminTeamsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'PLATFORM_ADMIN' && user.role !== 'CENTER_ADMIN') redirect('/app')

  const teams = await getTeams()

  const totalTeams = teams.length
  const activeTeams = teams.filter((t) => t.isActive).length
  const inactiveTeams = totalTeams - activeTeams
  const totalMembers = teams.reduce((sum, t) => sum + t.membersCount, 0)

  return (
    <div className="space-y-8">
      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Teams
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          View and manage all teams on the platform. Toggle active status or inspect members.
        </p>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Teams" value={totalTeams} />
        <StatCard label="Active" value={activeTeams} accent />
        <StatCard label="Inactive" value={inactiveTeams} />
        <StatCard label="Total Members" value={totalMembers} />
      </div>

      {/* ── Table ── */}
      <TeamsTable teams={teams} />
    </div>
  )
}
