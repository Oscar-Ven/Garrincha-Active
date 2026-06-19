'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toggleTeamActiveAction } from './actions'
import type { TeamRole } from '@/generated/prisma'

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface TeamRow {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  isActive: boolean
  createdAt: string // serialised ISO string
  center: { id: string; name: string; city: string | null } | null
  membersCount: number
  members: {
    id: string
    role: TeamRole
    joinedAt: string // serialised ISO string
    user: {
      id: string
      name: string
      nickname: string
      email: string
      avatarUrl: string | null
    }
  }[]
}

// ─── Role badge ───────────────────────────────────────────────────────────────

function RolePill({ role }: { role: TeamRole }) {
  const styleMap: Record<TeamRole, string> = {
    OWNER: 'bg-yellow-500/15 text-yellow-400 border border-yellow-600/30',
    ADMIN: 'bg-blue-500/15 text-blue-400 border border-blue-600/30',
    MEMBER: 'bg-slate-500/15 text-slate-400 border border-slate-600/30',
  }

  const labelMap: Record<TeamRole, string> = {
    OWNER: 'Owner',
    ADMIN: 'Admin',
    MEMBER: 'Member',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        styleMap[role]
      )}
    >
      {labelMap[role]}
    </span>
  )
}

// ─── Team avatar ──────────────────────────────────────────────────────────────

function TeamAvatar({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        className="h-9 w-9 rounded-lg object-cover shrink-0"
      />
    )
  }

  return (
    <div className="h-9 w-9 rounded-lg bg-green-600/20 flex items-center justify-center font-bold text-green-400 text-xs shrink-0 select-none">
      {initials}
    </div>
  )
}

// ─── User avatar ──────────────────────────────────────────────────────────────

function UserAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className="h-8 w-8 rounded-full object-cover shrink-0"
      />
    )
  }

  return (
    <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300 shrink-0 select-none">
      {initials}
    </div>
  )
}

// ─── Members modal ────────────────────────────────────────────────────────────

interface MembersModalProps {
  team: TeamRow | null
  onClose: () => void
}

function MembersModal({ team, onClose }: MembersModalProps) {
  const open = team !== null

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {team && (
              <>
                <TeamAvatar name={team.name} imageUrl={team.imageUrl} />
                <span className="truncate">{team.name}</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {team
              ? `${team.membersCount} ${team.membersCount === 1 ? 'member' : 'members'}${team.center ? ` · ${team.center.name}` : ''}`
              : ''}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable member list */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {team && team.members.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">No members yet.</p>
          )}

          {team && team.members.length > 0 && (
            <ul className="divide-y divide-slate-700/60">
              {team.members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  <UserAvatar name={m.user.name} avatarUrl={m.user.avatarUrl} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{m.user.name}</p>
                    <p className="text-xs text-slate-400 truncate">@{m.user.nickname}</p>
                  </div>
                  <RolePill role={m.role} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Toggle button ────────────────────────────────────────────────────────────

function ToggleActiveButton({
  teamId,
  isActive,
}: {
  teamId: string
  isActive: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleToggle() {
    setError(null)
    startTransition(async () => {
      const res = await toggleTeamActiveAction(teamId, !isActive)
      if (res?.error) {
        setError(res.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant={isActive ? 'outline' : 'default'}
        size="sm"
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          'min-w-20',
          isActive
            ? 'border-red-700/50 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-600'
            : 'bg-green-600 text-white hover:bg-green-700'
        )}
      >
        {isPending ? (isActive ? 'Deactivating…' : 'Activating…') : isActive ? 'Deactivate' : 'Activate'}
      </Button>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}

// ─── Main table ───────────────────────────────────────────────────────────────

export function TeamsTable({ teams }: { teams: TeamRow[] }) {
  const [selectedTeam, setSelectedTeam] = useState<TeamRow | null>(null)

  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-700 bg-slate-800/40 px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-700">
          <svg
            className="h-7 w-7 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
            />
          </svg>
        </div>
        <div>
          <p className="text-base font-semibold text-slate-200">No teams found</p>
          <p className="mt-1 text-sm text-slate-400">Teams created by players will appear here.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-slate-700/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/60 bg-slate-800/60">
              <th className="px-4 py-3 text-left font-medium text-slate-400">Team</th>
              <th className="px-4 py-3 text-left font-medium text-slate-400">Center</th>
              <th className="px-4 py-3 text-center font-medium text-slate-400">Members</th>
              <th className="px-4 py-3 text-center font-medium text-slate-400">Status</th>
              <th className="px-4 py-3 text-right font-medium text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40">
            {teams.map((team) => (
              <tr
                key={team.id}
                className="bg-slate-900/40 hover:bg-slate-800/60 transition-colors"
              >
                {/* Team name + avatar */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <TeamAvatar name={team.name} imageUrl={team.imageUrl} />
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate max-w-45">{team.name}</p>
                      {team.description && (
                        <p className="text-xs text-slate-400 truncate max-w-45">
                          {team.description}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Center */}
                <td className="px-4 py-3">
                  {team.center ? (
                    <div>
                      <p className="text-slate-200 truncate max-w-35">{team.center.name}</p>
                      {team.center.city && (
                        <p className="text-xs text-slate-400">{team.center.city}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-500 text-xs">—</span>
                  )}
                </td>

                {/* Members count — clickable */}
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => setSelectedTeam(team)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors',
                      'bg-slate-700/60 text-slate-200 hover:bg-green-600/20 hover:text-green-400'
                    )}
                    title="View members"
                  >
                    <svg
                      className="h-3.5 w-3.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                      />
                    </svg>
                    {team.membersCount}
                  </button>
                </td>

                {/* Active status */}
                <td className="px-4 py-3 text-center">
                  <Badge
                    variant={team.isActive ? 'default' : 'secondary'}
                    className={cn(
                      team.isActive
                        ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                        : 'bg-slate-700/40 text-slate-400 border border-slate-600/30'
                    )}
                  >
                    {team.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-right">
                  <ToggleActiveButton teamId={team.id} isActive={team.isActive} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {teams.map((team) => (
          <div
            key={team.id}
            className={cn(
              'rounded-xl border p-4 space-y-3 transition-colors',
              team.isActive
                ? 'border-slate-700/60 bg-slate-800/40'
                : 'border-slate-700/40 bg-slate-800/20 opacity-70'
            )}
          >
            {/* Header */}
            <div className="flex items-start gap-3">
              <TeamAvatar name={team.name} imageUrl={team.imageUrl} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-white truncate">{team.name}</p>
                  <Badge
                    variant={team.isActive ? 'default' : 'secondary'}
                    className={cn(
                      'text-xs',
                      team.isActive
                        ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                        : 'bg-slate-700/40 text-slate-400 border border-slate-600/30'
                    )}
                  >
                    {team.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {team.center && (
                  <p className="text-xs text-slate-400 truncate">
                    {team.center.name}
                    {team.center.city ? ` · ${team.center.city}` : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Meta row */}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedTeam(team)}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-green-400 transition-colors"
              >
                <svg
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                  />
                </svg>
                <span>{team.membersCount} {team.membersCount === 1 ? 'member' : 'members'}</span>
              </button>

              <ToggleActiveButton teamId={team.id} isActive={team.isActive} />
            </div>
          </div>
        ))}
      </div>

      {/* Members modal */}
      <MembersModal team={selectedTeam} onClose={() => setSelectedTeam(null)} />
    </>
  )
}
