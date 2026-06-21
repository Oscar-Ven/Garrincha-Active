'use client'

import { useState, useTransition } from 'react'
import { EventStatus, EventType } from '@/generated/prisma'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn, formatDateTime } from '@/lib/utils'
import { createEventAction, updateEventStatusAction, markAttendanceAction } from './actions'
import Link from 'next/link'
import { Plus, CheckCircle2, Users, Calendar, MapPin, Trophy } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EventRow {
  id: string
  title: string
  type: EventType
  status: EventStatus
  location: string | null
  startDate: Date
  endDate: Date
  capacity: number | null
  pointsReward: number
  isTournament: boolean
  createdAt: Date
  center: { id: string; name: string } | null
  _count: { registrations: number }
}

export interface RegistrationRow {
  id: string
  attended: boolean
  attendedAt: Date | null
  registeredAt: Date
  user: {
    id: string
    name: string
    nickname: string
    avatarUrl: string | null
  }
}

interface Center {
  id: string
  name: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function eventTypeLabel(type: EventType): string {
  const map: Record<EventType, string> = {
    TRAINING_SESSION: 'Training',
    TOURNAMENT: 'Tournament',
    LEAGUE: 'League',
    CAMP: 'Camp',
    COMMUNITY_EVENT: 'Community',
  }
  return map[type] ?? type
}

function statusConfig(status: EventStatus) {
  switch (status) {
    case EventStatus.DRAFT:
      return { label: 'Draft', className: 'bg-slate-700 text-slate-300 border-slate-600' }
    case EventStatus.PUBLISHED:
      return { label: 'Published', className: 'bg-green-900/50 text-green-300 border-green-800' }
    case EventStatus.CANCELLED:
      return { label: 'Cancelled', className: 'bg-red-900/50 text-red-300 border-red-800' }
    case EventStatus.COMPLETED:
      return { label: 'Completed', className: 'bg-blue-900/50 text-blue-300 border-blue-800' }
  }
}

function nextStatuses(current: EventStatus): { status: EventStatus; label: string; variant: 'default' | 'destructive' | 'outline' }[] {
  switch (current) {
    case EventStatus.DRAFT:
      return [
        { status: EventStatus.PUBLISHED, label: 'Publish', variant: 'default' },
        { status: EventStatus.CANCELLED, label: 'Cancel', variant: 'destructive' },
      ]
    case EventStatus.PUBLISHED:
      return [
        { status: EventStatus.COMPLETED, label: 'Complete', variant: 'outline' },
        { status: EventStatus.CANCELLED, label: 'Cancel', variant: 'destructive' },
      ]
    case EventStatus.COMPLETED:
      return []
    case EventStatus.CANCELLED:
      return [{ status: EventStatus.DRAFT, label: 'Reopen as Draft', variant: 'outline' }]
  }
}

// ─── Create Event Dialog ──────────────────────────────────────────────────────

export function CreateEventDialog({ centers }: { centers: Center[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await createEventAction(formData)
        setOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create event')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="md" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-900/40 border border-red-700/50 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" name="title" placeholder="Event title" required />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="description">Description *</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Event description"
                required
                className={cn(
                  'flex w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400',
                  'focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600',
                  'disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors duration-150'
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="type">Type *</Label>
              <select
                id="type"
                name="type"
                required
                className={cn(
                  'flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100',
                  'focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                <option value="">Select type</option>
                <option value="TRAINING_SESSION">Training Session</option>
                <option value="TOURNAMENT">Tournament</option>
                <option value="LEAGUE">League</option>
                <option value="CAMP">Camp</option>
                <option value="COMMUNITY_EVENT">Community Event</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status">Initial Status</Label>
              <select
                id="status"
                name="status"
                defaultValue="DRAFT"
                className={cn(
                  'flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100',
                  'focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start Date & Time *</Label>
              <Input
                id="startDate"
                name="startDate"
                type="datetime-local"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="endDate">End Date & Time *</Label>
              <Input
                id="endDate"
                name="endDate"
                type="datetime-local"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" placeholder="Venue or address" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="centerId">Center</Label>
              <select
                id="centerId"
                name="centerId"
                className={cn(
                  'flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100',
                  'focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                <option value="">No center (platform-wide)</option>
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                min="1"
                placeholder="Leave blank for unlimited"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pointsReward">Points Reward</Label>
              <Input
                id="pointsReward"
                name="pointsReward"
                type="number"
                min="0"
                defaultValue="0"
                placeholder="Points awarded for attendance"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input id="imageUrl" name="imageUrl" placeholder="https://..." />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                id="isTournament"
                name="isTournament"
                type="checkbox"
                value="true"
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-green-600 focus:ring-green-600"
              />
              <Label htmlFor="isTournament" className="cursor-pointer">
                Mark as Tournament
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating...' : 'Create Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Status Toggle ────────────────────────────────────────────────────────────

export function StatusActions({ eventId, currentStatus }: { eventId: string; currentStatus: EventStatus }) {
  const [isPending, startTransition] = useTransition()
  const actions = nextStatuses(currentStatus)

  if (actions.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {actions.map(({ status, label, variant }) => (
        <Button
          key={status}
          variant={variant}
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await updateEventStatusAction(eventId, status)
            })
          }
        >
          {isPending ? '...' : label}
        </Button>
      ))}
    </div>
  )
}

// ─── Registrations Dialog ─────────────────────────────────────────────────────

export function RegistrationsDialog({
  event,
  registrations,
}: {
  event: EventRow
  registrations: RegistrationRow[]
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [markingId, setMarkingId] = useState<string | null>(null)

  const attended = registrations.filter((r) => r.attended).length

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors"
          title="View registrations"
        >
          <Users className="h-4 w-4 text-slate-400" />
          <span>{event._count.registrations}</span>
          {event.capacity !== null && (
            <span className="text-slate-500">/ {event.capacity}</span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="pr-8">{event.title} — Registrations</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4 py-2 text-sm text-slate-400 border-b border-slate-800 shrink-0">
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {event._count.registrations} registered
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            {attended} attended
          </span>
          {event.capacity !== null && (
            <span className="flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-yellow-400" />
              {event.capacity} capacity
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {registrations.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No registrations yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-800">
                  <th className="py-2.5 px-3 font-medium text-slate-400 w-full">Player</th>
                  <th className="py-2.5 px-3 font-medium text-slate-400 whitespace-nowrap">Registered</th>
                  <th className="py-2.5 px-3 font-medium text-slate-400 text-center">Attended</th>
                  {event.status === EventStatus.COMPLETED || event.status === EventStatus.PUBLISHED ? (
                    <th className="py-2.5 px-3 font-medium text-slate-400 text-center">Action</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {registrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <div>
                        <p className="text-white font-medium">{reg.user.name}</p>
                        <p className="text-xs text-slate-500">@{reg.user.nickname}</p>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      {formatDateTime(reg.registeredAt)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {reg.attended ? (
                        <span className="inline-flex items-center gap-1 text-green-400 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {reg.attendedAt ? formatDateTime(reg.attendedAt) : 'Yes'}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                    {(event.status === EventStatus.COMPLETED || event.status === EventStatus.PUBLISHED) ? (
                      <td className="py-2.5 px-3 text-center">
                        {!reg.attended && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending && markingId === reg.user.id}
                            onClick={() => {
                              setMarkingId(reg.user.id)
                              startTransition(async () => {
                                await markAttendanceAction(event.id, reg.user.id)
                                setMarkingId(null)
                              })
                            }}
                          >
                            {pending && markingId === reg.user.id ? '...' : 'Mark Attended'}
                          </Button>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Events Table ─────────────────────────────────────────────────────────────

export function EventsTable({
  events,
  registrationsMap,
  centers,
}: {
  events: EventRow[]
  registrationsMap: Record<string, RegistrationRow[]>
  centers: Center[]
}) {
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterType, setFilterType] = useState<string>('ALL')
  const [search, setSearch] = useState('')

  const filtered = events.filter((e) => {
    if (filterStatus !== 'ALL' && e.status !== filterStatus) return false
    if (filterType !== 'ALL' && e.type !== filterType) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        e.title.toLowerCase().includes(q) ||
        (e.location ?? '').toLowerCase().includes(q) ||
        (e.center?.name ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="h-9 w-56 text-sm"
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-36 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-9 w-40 text-sm">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="TRAINING_SESSION">Training</SelectItem>
            <SelectItem value="TOURNAMENT">Tournament</SelectItem>
            <SelectItem value="LEAGUE">League</SelectItem>
            <SelectItem value="CAMP">Camp</SelectItem>
            <SelectItem value="COMMUNITY_EVENT">Community</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-slate-500">
          {filtered.length} of {events.length} events
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60">
              <th className="py-3 px-4 text-left font-medium text-slate-400">Title</th>
              <th className="py-3 px-4 text-left font-medium text-slate-400">Type</th>
              <th className="py-3 px-4 text-left font-medium text-slate-400">Status</th>
              <th className="py-3 px-4 text-left font-medium text-slate-400">Center</th>
              <th className="py-3 px-4 text-left font-medium text-slate-400">Start Date</th>
              <th className="py-3 px-4 text-center font-medium text-slate-400">Registrations</th>
              <th className="py-3 px-4 text-left font-medium text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
                  No events found.
                </td>
              </tr>
            )}
            {filtered.map((event) => {
              const sc = statusConfig(event.status)
              return (
                <tr
                  key={event.id}
                  className="hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-white font-medium leading-snug">{event.title}</span>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </span>
                        )}
                        {event.isTournament && (
                          <span className="flex items-center gap-1 text-yellow-500">
                            <Trophy className="h-3 w-3" />
                            Tournament
                          </span>
                        )}
                        {event.pointsReward > 0 && (
                          <span className="text-green-500">{event.pointsReward} pts</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-slate-300 text-xs font-medium">{eventTypeLabel(event.type)}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                        sc.className
                      )}
                    >
                      {sc.label}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-slate-400 text-xs">
                      {event.center?.name ?? <span className="text-slate-600 italic">Platform-wide</span>}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-slate-300 text-xs flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-500" />
                        {formatDateTime(event.startDate)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <RegistrationsDialog
                      event={event}
                      registrations={registrationsMap[event.id] ?? []}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-2">
                      <StatusActions eventId={event.id} currentStatus={event.status} />
                      {event.isTournament && (
                        <Link
                          href={`/admin/events/${event.id}/bracket`}
                          className="inline-flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 transition-colors font-medium"
                        >
                          <Trophy className="h-3 w-3" />
                          Manage Bracket
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
