import { redirect, notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'
import { Calendar, MapPin, Users, Zap, Trophy } from 'lucide-react'
import { registerForEvent, cancelEventRegistration } from '@/services/events'

const eventTypeLabels: Record<string, string> = {
  TRAINING_SESSION: 'Training Session',
  TOURNAMENT: 'Tournament',
  LEAGUE: 'League',
  CAMP: 'Camp',
  COMMUNITY_EVENT: 'Community Event',
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      center: true,
      registrations: {
        where: { waitlisted: false },
      },
      _count: { select: { registrations: true } },
    },
  })

  if (!event) notFound()

  const myRegistration = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId: id, userId: user.id } },
    select: { id: true, attended: true, waitlisted: true },
  })

  // Confirmed registrants count (non-waitlisted)
  const confirmedCount = event.registrations.length
  // Total registrations including waitlist
  const totalCount = event._count.registrations
  const waitlistCount = totalCount - confirmedCount

  const isFull = event.capacity !== null && confirmedCount >= event.capacity
  const isRegistered = !!myRegistration && !myRegistration.waitlisted
  const isWaitlisted = !!myRegistration && myRegistration.waitlisted

  // Compute waitlist position for this user
  let waitlistPosition: number | null = null
  if (isWaitlisted) {
    const waitlistedRegs = await prisma.eventRegistration.findMany({
      where: { eventId: id, waitlisted: true },
      orderBy: { registeredAt: 'asc' },
      select: { id: true },
    })
    waitlistPosition = waitlistedRegs.findIndex((r) => r.id === myRegistration!.id) + 1
  }

  async function registerAction() {
    'use server'
    const u = await getCurrentUser()
    if (!u) return
    try {
      await registerForEvent(u.id, id)
    } catch {
      // already registered or closed — swallow
    }
    revalidatePath(`/app/events/${id}`)
  }

  async function cancelAction() {
    'use server'
    const u = await getCurrentUser()
    if (!u) return
    await cancelEventRegistration(u.id, id)
    revalidatePath(`/app/events/${id}`)
  }

  const spotsLeft = event.capacity !== null ? event.capacity - confirmedCount : null

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
                {event.capacity !== null
                  ? `${confirmedCount}/${event.capacity} registered`
                  : `${confirmedCount} registered`}
                {waitlistCount > 0 && ` · ${waitlistCount} on waitlist`}
                {spotsLeft !== null && spotsLeft > 0 && ` · ${spotsLeft} spots left`}
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
              <div className="space-y-3">
                <div className="rounded-lg bg-green-900/30 border border-green-700/50 px-4 py-3 text-green-300 text-sm">
                  ✓ You are registered for this event
                  {myRegistration?.attended && (
                    <span className="block mt-1 text-green-400 font-medium">Attendance marked ✓</span>
                  )}
                </div>
                <form action={cancelAction}>
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:border-red-600/40 hover:text-red-400 transition-colors"
                  >
                    Cancel registration
                  </button>
                </form>
              </div>
            ) : isWaitlisted ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-yellow-900/30 border border-yellow-700/50 px-4 py-3 text-yellow-300 text-sm">
                  <p className="font-semibold">You're on the waitlist</p>
                  {waitlistPosition !== null && (
                    <p className="mt-1 text-yellow-400">
                      You're #{waitlistPosition} on the waitlist. We'll notify you if a spot opens.
                    </p>
                  )}
                </div>
                <form action={cancelAction}>
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:border-red-600/40 hover:text-red-400 transition-colors"
                  >
                    Leave waitlist
                  </button>
                </form>
              </div>
            ) : isFull ? (
              <form action={registerAction}>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-yellow-600 text-white py-2.5 font-semibold hover:bg-yellow-500 transition-colors"
                >
                  Join Waitlist
                </button>
              </form>
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
