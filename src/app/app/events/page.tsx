import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Calendar, MapPin, Users, Zap } from 'lucide-react'

export const metadata = { title: 'Events' }

const eventTypeLabels: Record<string, string> = {
  TRAINING_SESSION: 'Training',
  TOURNAMENT: 'Tournament',
  LEAGUE: 'League',
  CAMP: 'Camp',
  COMMUNITY_EVENT: 'Community',
}

const eventTypeColors: Record<string, string> = {
  TRAINING_SESSION: 'bg-blue-900/40 text-blue-300',
  TOURNAMENT: 'bg-yellow-900/40 text-yellow-300',
  LEAGUE: 'bg-purple-900/40 text-purple-300',
  CAMP: 'bg-green-900/40 text-green-300',
  COMMUNITY_EVENT: 'bg-slate-700 text-slate-300',
}

export default async function EventsPage() {
  const session = await getCurrentUser()
  if (!session) redirect('/login')

  const now = new Date()

  const upcomingEvents = await prisma.event.findMany({
    where: { status: 'PUBLISHED', startDate: { gt: now } },
    orderBy: { startDate: 'asc' },
    include: {
      center: { select: { name: true, city: true } },
      _count: { select: { registrations: true } },
    },
  })

  const myRegistrations = await prisma.eventRegistration.findMany({
    where: { userId: session.id },
    select: { eventId: true },
  })
  const myEventIds = new Set(myRegistrations.map((r) => r.eventId))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Calendar className="h-6 w-6 text-blue-400" /> Events
      </h1>

      {upcomingEvents.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-12 text-center">
            <Calendar className="h-10 w-10 mx-auto text-slate-500 mb-3" />
            <p className="text-slate-400">No upcoming events right now.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {upcomingEvents.map((event) => {
            const isRegistered = myEventIds.has(event.id)
            const spotsLeft = event.capacity ? event.capacity - event._count.registrations : null
            return (
              <Card key={event.id} className="bg-slate-800 border-slate-700 hover:border-slate-500 transition-colors">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${eventTypeColors[event.type] ?? 'text-slate-400 bg-slate-700'}`}>
                      {eventTypeLabels[event.type] ?? event.type}
                    </span>
                    {isRegistered && (
                      <span className="text-xs rounded-full bg-green-900/50 text-green-300 px-2 py-0.5 font-medium">
                        Registered ✓
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-white mb-2 leading-snug">{event.title}</h3>
                  <div className="space-y-1.5 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>{formatDateTime(event.startDate)}</span>
                    </div>
                    {event.center && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>{event.center.name}{event.center.city ? `, ${event.center.city}` : ''}</span>
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {event._count.registrations} registered
                        {spotsLeft !== null && ` · ${spotsLeft} spots left`}
                      </span>
                    </div>
                    {event.pointsReward > 0 && (
                      <div className="flex items-center gap-1.5 text-yellow-400">
                        <Zap className="h-3.5 w-3.5 shrink-0" />
                        <span>{event.pointsReward} points on attendance</span>
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/app/events/${event.id}`}
                    className="mt-4 block w-full text-center rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm py-2 font-medium transition-colors"
                  >
                    {isRegistered ? 'View Details' : 'Register'}
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
