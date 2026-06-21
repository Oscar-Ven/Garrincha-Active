import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { EventStatus } from '@/generated/prisma'
import { cn, formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Events — Admin' }

export default async function AdminEventsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'PLATFORM_ADMIN' && user.role !== 'CENTER_ADMIN') redirect('/app')

  const events = await prisma.event.findMany({
    orderBy: { startDate: 'desc' },
    include: {
      center: { select: { id: true, name: true } },
      _count: { select: { registrations: true } },
    },
  })

  const now = new Date()
  const publishedCount = events.filter((e) => e.status === EventStatus.PUBLISHED).length
  const upcomingCount  = events.filter((e) => e.startDate > now).length
  const pastCount      = events.filter((e) => e.endDate < now).length

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed/10">
            <span className="material-symbols-outlined text-primary-fixed" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>event</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Events</h1>
            <p className="text-sm text-on-surface-variant">Manage platform events and registrations.</p>
          </div>
        </div>
        <Link
          href="/admin/events/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary-fixed px-4 py-2 text-sm font-semibold text-on-primary-fixed transition-colors hover:bg-primary-fixed-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>add</span>
          New Event
        </Link>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Events', value: events.length,  icon: 'event' },
          { label: 'Published',    value: publishedCount, icon: 'public' },
          { label: 'Upcoming',     value: upcomingCount,  icon: 'schedule' },
          { label: 'Past',         value: pastCount,      icon: 'history' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{icon}</span>
              <p className="text-xs">{label}</p>
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums text-on-surface">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Events table ── */}
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-surface-container py-16 text-center">
          <span className="material-symbols-outlined text-on-surface-variant/40" style={{ fontSize: '40px' }}>event</span>
          <p className="text-sm font-semibold text-on-surface">No events yet</p>
          <p className="text-xs text-on-surface-variant">Create your first event to get started.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-surface-container">
                {['Title', 'Center', 'Dates', 'Registrations', 'Status', 'Actions'].map((col) => (
                  <th key={col} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-surface-container-lowest/40">
              {events.map((event) => {
                const isPublished = event.status === EventStatus.PUBLISHED
                const isUpcoming  = event.startDate > now
                const isPast      = event.endDate < now
                const isOngoing   = !isUpcoming && !isPast

                return (
                  <tr key={event.id} className="transition-colors hover:bg-surface-container">
                    <td className="max-w-52 px-4 py-3">
                      <p className="truncate font-medium text-on-surface">{event.title}</p>
                      {event.description && (
                        <p className="mt-0.5 truncate text-xs text-on-surface-variant">{event.description}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-on-surface-variant">
                      {event.center?.name ?? <span className="text-on-surface-variant/30">Platform-wide</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="text-xs text-on-surface">{formatDate(event.startDate)}</p>
                      <p className="text-xs text-on-surface-variant">to {formatDate(event.endDate)}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <span className="font-semibold text-on-surface tabular-nums">{event._count.registrations}</span>
                      {event.capacity && (
                        <span className="text-xs text-on-surface-variant"> / {event.capacity}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          isPublished
                            ? 'bg-primary-fixed/10 text-primary-fixed'
                            : 'bg-surface-container text-on-surface-variant',
                        )}>
                          {event.status.charAt(0) + event.status.slice(1).toLowerCase()}
                        </span>
                        {isUpcoming && <span className="inline-flex items-center rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary">Upcoming</span>}
                        {isOngoing  && <span className="inline-flex items-center rounded-full bg-[#FFD700]/10 px-2 py-0.5 text-xs font-medium text-[#FFD700]">Ongoing</span>}
                        {isPast     && <span className="text-xs text-on-surface-variant/60">Ended</span>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link
                        href={`/admin/events/${event.id}/edit`}
                        className="glass-card inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-on-surface transition-colors hover:border-primary-fixed/40 hover:text-primary-fixed"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>edit</span>
                        Edit
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
