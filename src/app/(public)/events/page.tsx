import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { EventStatus, EventType } from '@/generated/prisma'
import { formatDate, formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Events | Garrincha Active',
  description: 'Browse upcoming sports events, tournaments, training sessions, and community events.',
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  TRAINING_SESSION: 'Training Session',
  TOURNAMENT: 'Tournament',
  LEAGUE: 'League',
  CAMP: 'Camp',
  COMMUNITY_EVENT: 'Community Event',
}

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  TRAINING_SESSION: 'bg-blue-500/15 text-blue-400 ring-1 ring-inset ring-blue-500/30',
  TOURNAMENT: 'bg-yellow-500/15 text-yellow-400 ring-1 ring-inset ring-yellow-500/30',
  LEAGUE: 'bg-purple-500/15 text-purple-400 ring-1 ring-inset ring-purple-500/30',
  CAMP: 'bg-orange-500/15 text-orange-400 ring-1 ring-inset ring-orange-500/30',
  COMMUNITY_EVENT: 'bg-green-500/15 text-green-400 ring-1 ring-inset ring-green-500/30',
}

type EventWithCenter = {
  id: string
  title: string
  type: EventType
  location: string | null
  startDate: Date
  endDate: Date
  capacity: number | null
  pointsReward: number
  imageUrl: string | null
  isTournament: boolean
  center: { id: string; name: string; city: string | null } | null
  _count: { registrations: number }
}

async function getUpcomingEvents(): Promise<EventWithCenter[]> {
  return prisma.event.findMany({
    where: {
      status: EventStatus.PUBLISHED,
      startDate: { gt: new Date() },
    },
    orderBy: { startDate: 'asc' },
    select: {
      id: true,
      title: true,
      type: true,
      location: true,
      startDate: true,
      endDate: true,
      capacity: true,
      pointsReward: true,
      imageUrl: true,
      isTournament: true,
      center: {
        select: { id: true, name: true, city: true },
      },
      _count: {
        select: { registrations: true },
      },
    },
  }) as Promise<EventWithCenter[]>
}

function EventCard({ event }: { event: EventWithCenter }) {
  const spotsLeft =
    event.capacity !== null
      ? event.capacity - event._count.registrations
      : null
  const isFull = spotsLeft !== null && spotsLeft <= 0

  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex flex-col rounded-xl border border-slate-700/60 bg-slate-800/50 overflow-hidden transition-all duration-200 hover:border-green-600/50 hover:bg-slate-800 hover:shadow-lg hover:shadow-black/20"
    >
      {/* Image or color band */}
      {event.imageUrl ? (
        <div className="h-44 w-full overflow-hidden bg-slate-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.imageUrl}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="h-44 w-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
          <span className="text-5xl select-none opacity-40">
            {event.type === EventType.TOURNAMENT || event.isTournament
              ? '🏆'
              : event.type === EventType.TRAINING_SESSION
              ? '⚽'
              : event.type === EventType.LEAGUE
              ? '🥇'
              : event.type === EventType.CAMP
              ? '🏕️'
              : '📅'}
          </span>
        </div>
      )}

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Type badge */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
              EVENT_TYPE_COLORS[event.type]
            )}
          >
            {EVENT_TYPE_LABELS[event.type]}
          </span>
          {event.isTournament && event.type !== EventType.TOURNAMENT && (
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-500/15 text-yellow-400 ring-1 ring-inset ring-yellow-500/30">
              Tournament
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-white leading-snug group-hover:text-green-400 transition-colors line-clamp-2">
          {event.title}
        </h3>

        {/* Meta rows */}
        <div className="mt-auto space-y-1.5 text-sm text-slate-400">
          {/* Date */}
          <div className="flex items-center gap-2">
            <CalendarIcon />
            <span>{formatDateTime(event.startDate)}</span>
          </div>

          {/* Center */}
          {event.center && (
            <div className="flex items-center gap-2">
              <BuildingIcon />
              <span className="truncate">
                {event.center.name}
                {event.center.city ? ` · ${event.center.city}` : ''}
              </span>
            </div>
          )}

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-2">
              <LocationIcon />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>

        {/* Footer: points + capacity */}
        <div className="mt-3 flex items-center justify-between border-t border-slate-700/60 pt-3">
          {event.pointsReward > 0 ? (
            <span className="text-xs font-medium text-yellow-500">
              +{event.pointsReward} pts on attendance
            </span>
          ) : (
            <span />
          )}
          {spotsLeft !== null && (
            <span
              className={cn(
                'text-xs font-medium',
                isFull
                  ? 'text-red-400'
                  : spotsLeft <= 5
                  ? 'text-orange-400'
                  : 'text-slate-500'
              )}
            >
              {isFull
                ? 'Full'
                : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function CalendarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4 shrink-0 text-slate-500"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function BuildingIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4 shrink-0 text-slate-500"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M4 16.5v-13h-.25a.75.75 0 0 1 0-1.5h12.5a.75.75 0 0 1 0 1.5H16v13h.25a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75v-2.5a.75.75 0 0 0-.75-.75h-2.5a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 1-.75.75h-3.5a.75.75 0 0 1 0-1.5H4Zm3-11a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5A.75.75 0 0 1 7 5.5Zm.75 2.25a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 0-1.5h-.5ZM7 11.5a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75Zm3.25-5.25a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 0-1.5h-.5Zm-.75 3a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 0-1.5h-.5Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4 shrink-0 text-slate-500"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export default async function EventsPage() {
  const events = await getUpcomingEvents()

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Page header */}
      <div className="border-b border-slate-700/50 bg-slate-900/80">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Upcoming Events
            </h1>
            <p className="text-slate-400">
              Training sessions, tournaments, leagues, and community events near you.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-800/30 py-24 text-center">
            <span className="text-5xl opacity-40 select-none">📅</span>
            <p className="mt-4 text-lg font-medium text-slate-300">No upcoming events</p>
            <p className="mt-1 text-sm text-slate-500">
              Check back soon — events will appear here once published.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-slate-500">
              {events.length} event{events.length !== 1 ? 's' : ''} available
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
