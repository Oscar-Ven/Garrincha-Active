'use client'

import { useTransition, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { joinTeamAction, leaveTeamAction, createTeamAction } from './actions'
import { TeamRole } from '@/generated/prisma'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamCardProps {
  team: {
    id: string
    name: string
    description: string | null
    imageUrl: string | null
    center: { id: string; name: string; city: string | null } | null
    _count: { members: number }
  }
  membership: { role: TeamRole } | null
}

// ─── Team Avatar ──────────────────────────────────────────────────────────────

function TeamAvatar({
  name,
  imageUrl,
  size = 'md',
}: {
  name: string
  imageUrl: string | null
  size?: 'sm' | 'md' | 'lg'
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  const sizeClasses = {
    sm: 'h-10 w-10 text-sm',
    md: 'h-14 w-14 text-base',
    lg: 'h-16 w-16 text-lg',
  }

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        className={cn(
          'rounded-xl object-cover shrink-0',
          sizeClasses[size]
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-xl bg-green-600/20 flex items-center justify-center font-bold text-green-400 shrink-0',
        sizeClasses[size]
      )}
    >
      {initials}
    </div>
  )
}

// ─── Role Badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: TeamRole }) {
  const map: Record<TeamRole, { label: string; className: string }> = {
    OWNER: {
      label: 'Owner',
      className: 'bg-yellow-500/15 text-yellow-400 border border-yellow-600/30',
    },
    ADMIN: {
      label: 'Admin',
      className: 'bg-blue-500/15 text-blue-400 border border-blue-600/30',
    },
    MEMBER: {
      label: 'Member',
      className: 'bg-green-500/15 text-green-400 border border-green-600/30',
    },
  }
  const { label, className } = map[role]
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', className)}>
      {label}
    </span>
  )
}

// ─── Team Card ────────────────────────────────────────────────────────────────

export function TeamCard({ team, membership }: TeamCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isMember = membership !== null
  const isOwner = membership?.role === TeamRole.OWNER

  function handleJoin() {
    setError(null)
    startTransition(async () => {
      const res = await joinTeamAction(team.id)
      if (res?.error) {
        setError(res.error)
      } else {
        router.refresh()
      }
    })
  }

  function handleLeave() {
    setError(null)
    startTransition(async () => {
      const res = await leaveTeamAction(team.id)
      if (res?.error) {
        setError(res.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-2xl border p-5 transition-colors',
        isMember
          ? 'border-green-700/50 bg-green-950/20'
          : 'border-slate-700/60 bg-slate-800/40 hover:border-slate-600'
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <TeamAvatar name={team.name} imageUrl={team.imageUrl} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-white truncate">{team.name}</h3>
            {membership && <RoleBadge role={membership.role} />}
          </div>
          {team.center && (
            <p className="mt-0.5 text-xs text-slate-400 truncate">
              {team.center.name}
              {team.center.city ? ` · ${team.center.city}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      {team.description && (
        <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">
          {team.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 mt-auto pt-1">
        {/* Member count */}
        <div className="flex items-center gap-1.5 text-slate-400">
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
          <span className="text-sm font-medium">{team._count.members}</span>
          <span className="text-xs">
            {team._count.members === 1 ? 'member' : 'members'}
          </span>
        </div>

        {/* Action button */}
        {isOwner ? (
          <span className="text-xs text-slate-500 italic">You own this team</span>
        ) : isMember ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleLeave}
            disabled={isPending}
            className="border-red-700/50 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-600 shrink-0"
          >
            {isPending ? 'Leaving…' : 'Leave'}
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={handleJoin}
            disabled={isPending}
            className="shrink-0"
          >
            {isPending ? 'Joining…' : 'Join'}
          </Button>
        )}
      </div>

      {/* Inline error */}
      {error && (
        <p className="rounded-lg bg-red-950/50 border border-red-800/50 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}

// ─── Create Team Dialog ───────────────────────────────────────────────────────

interface CreateTeamDialogProps {
  centers: Array<{ id: string; name: string; city: string | null }>
}

export function CreateTeamDialog({ centers }: CreateTeamDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await createTeamAction(formData)
      if (res?.error) {
        setError(res.error)
      } else {
        setOpen(false)
        formRef.current?.reset()
        router.refresh()
      }
    })
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="md">
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Create Team
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a New Team</DialogTitle>
            <DialogDescription>
              Start a team, invite members, and compete together in challenges.
            </DialogDescription>
          </DialogHeader>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            {/* Team name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-slate-300 text-sm">
                Team Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. FC Galaxy"
                maxLength={60}
                required
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-slate-300 text-sm">
                Description
              </Label>
              <textarea
                id="description"
                name="description"
                placeholder="Tell people what your team is about…"
                maxLength={300}
                rows={3}
                className={cn(
                  'w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400 resize-none',
                  'focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600',
                  'disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150'
                )}
              />
            </div>

            {/* Center */}
            {centers.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="centerId" className="text-slate-300 text-sm">
                  Sports Center (optional)
                </Label>
                <select
                  id="centerId"
                  name="centerId"
                  className={cn(
                    'w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white',
                    'focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600',
                    'disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150'
                  )}
                >
                  <option value="">No specific center</option>
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.city ? ` · ${c.city}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="rounded-lg bg-red-950/50 border border-red-800/50 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={isPending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating…' : 'Create Team'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
