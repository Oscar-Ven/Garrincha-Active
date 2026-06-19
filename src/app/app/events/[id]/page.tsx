import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'
import { Calendar, MapPin, Users, Zap, Trophy } from 'lucide-react'

const eventTypeLabels: Record<string, string> = {
  TRAINING_SESSION: 'Training Session',
  TOURNAMENT: 'Tournament',
  LEAGUE: 'League',
  CAMP: 'Camp',
  COMMUNITY_EVENT: 'Community Event',
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getCurrentUser()
  if (!session) redirect('/login')

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      center: true,
      registrations: {
        where: { userId: session.id },
        select: { id: true, attended: true },
      },
      _count: { select: { registrations: true } },
    },
  })

  if (!event) notFound()

  const isRegistered = event.registrations.length > 0
  const spotsLeft = event.capacity ? event.capacity - event._count.registrations : null
  const isFull = spotsLeft !== null && spotsLeft <= 0

  async function registerAction() {
    'use server'
    const user = await getCurrentUser()
    if (!user) return
    const existing = await prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId: id, userId: user.id } },
    })
    if (existing) return
    await prisma.eventRegistration.create({
      data: { eventId: id, userId: user.id },
    })
    redirect('/app/events')
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <span className="text-xs rounded-full bg-blue-900/40 text-blue-300 px-2 py-0.5 font-medium">
          {eventTypeLabels[event.type] ?? event.type}
        </span>
        <h1 className="text-2xl font-bold text-white mt-2">{event.title}</h1>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6 space-y-4">
          <p className="text-slate-300">{event.description}</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <Calendar className="h-4 w-4 text-blue-400" />
              <span>
                {formatDateTime(event.startDate)} – {formatDateTime(event.endDate)}
              </span>
            </div>
            {event.center && (
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin className="h-4 w-4 text-green-400" />
                <span>
                  {event.center.name}
                  {event.center.city ? `, ${event.center.city}` : ''}
                </span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin className="h-4 w-4 text-slate-500" />
                <span>{event.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-400">
              <Users className="h-4 w-4 text-purple-400" />
              <span>
                {event._count.registrations} registered
                {spotsLeft !== null ? ` · ${spotsLeft} spots left` : ''}
              </span>
            </div>
            {event.pointsReward > 0 && (
              <div className="flex items-center gap-2 text-yellow-400">
                <Zap className="h-4 w-4" />
                <span>{event.pointsReward} points awarded for attendance</span>
              </div>
            )}
            {event.isTournament && (
              <div className="flex items-center gap-2 text-yellow-400">
                <Trophy className="h-4 w-4" />
                <span>Tournament format — match schedule TBD</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-700">
            {isRegistered ? (
              <div className="rounded-lg bg-green-900/30 border border-green-700/50 px-4 py-3 text-green-300 text-sm">
                ✓ You are registered for this event
                {event.registrations[0]?.attended && (
                  <span className="block mt-1 text-green-400 font-medium">Attendance marked ✓</span>
                )}
              </div>
            ) : isFull ? (
              <div className="rounded-lg bg-red-900/30 border border-red-700/50 px-4 py-3 text-red-300 text-sm">
                This event is full.
              </div>
            ) : (
              <form action={registerAction}>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-green-600 text-white py-2.5 font-semibold hover:bg-green-500 transition-colors"
                >
                  Register for Event
                </button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
