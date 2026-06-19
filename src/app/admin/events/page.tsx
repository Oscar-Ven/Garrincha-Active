import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { EventType, EventStatus } from '@/generated/prisma'
import { Calendar } from 'lucide-react'
import { CreateEventDialog, EventsTable } from './EventsClient'
import type { EventRow, RegistrationRow } from './EventsClient'

export const metadata = { title: 'Events Management' }

export default async function AdminEventsPage() {
  const session = await getCurrentUser()
  if (!session) redirect('/login')
  if (session.role !== 'PLATFORM_ADMIN' && session.role !== 'CENTER_ADMIN') redirect('/app')

  const [rawEvents, centers] = await Promise.all([
    prisma.event.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        center: { select: { id: true, name: true } },
        _count: { select: { registrations: true } },
      },
    }),
    prisma.center.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  // Load registrations for all events (with user data)
  const allRegistrations = await prisma.eventRegistration.findMany({
    where: { eventId: { in: rawEvents.map((e) => e.id) } },
    include: {
      user: {
        select: { id: true, name: true, nickname: true, avatarUrl: true },
      },
    },
    orderBy: { registeredAt: 'desc' },
  })

  // Build a map: eventId -> RegistrationRow[]
  const registrationsMap: Record<string, RegistrationRow[]> = {}
  for (const reg of allRegistrations) {
    if (!registrationsMap[reg.eventId]) registrationsMap[reg.eventId] = []
    registrationsMap[reg.eventId].push({
      id: reg.id,
      attended: reg.attended,
      attendedAt: reg.attendedAt,
      registeredAt: reg.registeredAt,
      user: reg.user,
    })
  }

  // Cast to EventRow[] (serialisable — dates are fine since Next.js serialises them)
  const events: EventRow[] = rawEvents.map((e) => ({
    id: e.id,
    title: e.title,
    type: e.type as EventType,
    status: e.status as EventStatus,
    location: e.location,
    startDate: e.startDate,
    endDate: e.endDate,
    capacity: e.capacity,
    pointsReward: e.pointsReward,
    isTournament: e.isTournament,
    createdAt: e.createdAt,
    center: e.center,
    _count: e._count,
  }))

  // Stats
  const total = events.length
  const published = events.filter((e) => e.status === EventStatus.PUBLISHED).length
  const upcoming = events.filter(
    (e) => e.status === EventStatus.PUBLISHED && e.startDate > new Date()
  ).length
  const totalRegistrations = allRegistrations.length

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="h-6 w-6 text-green-400" />
            Events Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Create, schedule, and manage platform events
          </p>
        </div>
        <CreateEventDialog centers={centers} />
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Events', value: total, color: 'text-white' },
          { label: 'Published', value: published, color: 'text-green-400' },
          { label: 'Upcoming', value: upcoming, color: 'text-blue-400' },
          { label: 'Total Registrations', value: totalRegistrations, color: 'text-yellow-400' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-xl bg-slate-800/60 border border-slate-700/60 px-4 py-3"
          >
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table with client-side filtering + dialogs */}
      <EventsTable
        events={events}
        registrationsMap={registrationsMap}
        centers={centers}
      />
    </div>
  )
}
