import { redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { performCheckIn } from '@/services/checkin'

export default async function CheckInPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  // Look up the QR code for display info
  const qr = await prisma.centerQR.findUnique({
    where: { token },
    include: { center: { select: { id: true, name: true, city: true } } },
  })

  if (!qr || !qr.isActive) {
    return (
      <div className="mx-auto max-w-sm text-center py-20">
        <div className="text-5xl mb-4">❌</div>
        <h1 className="text-xl font-bold text-white">Invalid QR Code</h1>
        <p className="mt-2 text-sm text-slate-400">This check-in code is not valid or has been deactivated.</p>
        <Link href="/app" className="mt-6 inline-block rounded-xl bg-slate-700 px-6 py-3 text-sm text-white hover:bg-slate-600">
          Go Home
        </Link>
      </div>
    )
  }

  if (qr.expiresAt && qr.expiresAt < new Date()) {
    return (
      <div className="mx-auto max-w-sm text-center py-20">
        <div className="text-5xl mb-4">⏰</div>
        <h1 className="text-xl font-bold text-white">QR Code Expired</h1>
        <p className="mt-2 text-sm text-slate-400">This check-in code has expired. Ask your center admin for a new one.</p>
        <Link href="/app" className="mt-6 inline-block rounded-xl bg-slate-700 px-6 py-3 text-sm text-white hover:bg-slate-600">
          Go Home
        </Link>
      </div>
    )
  }

  // Check cooldown
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const existing = await prisma.venueCheckIn.findFirst({
    where: { userId: user.id, centerId: qr.centerId, checkedInAt: { gte: dayStart } },
  })

  async function handleCheckIn() {
    'use server'
    const currentUser = await getCurrentUser()
    if (!currentUser) redirect('/login')
    await performCheckIn(currentUser.id, token)
    revalidatePath(`/app/checkin/${token}`)
  }

  return (
    <div className="mx-auto max-w-sm">
      {/* Center info */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-br from-green-600 to-emerald-700 text-4xl shadow-lg">
          🏟️
        </div>
        <h1 className="text-2xl font-bold text-white">{qr.center.name}</h1>
        {qr.center.city && <p className="text-sm text-slate-400">{qr.center.city}</p>}
        {qr.label && <p className="mt-1 text-xs text-slate-500">{qr.label}</p>}
      </div>

      {existing ? (
        /* Already checked in today */
        <div className="rounded-2xl border border-green-600/30 bg-green-600/10 p-6 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h2 className="text-lg font-bold text-green-400">Already Checked In</h2>
          <p className="mt-2 text-sm text-slate-300">
            You already checked in at {qr.center.name} today.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Come back tomorrow for more points!
          </p>
          <Link
            href="/app"
            className="mt-5 inline-block w-full rounded-xl bg-slate-700 py-3 text-sm font-medium text-white hover:bg-slate-600 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      ) : (
        /* Check-in form */
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
          <div className="mb-6 text-center">
            <p className="text-slate-300 text-sm">
              Check in to <span className="font-semibold text-white">{qr.center.name}</span> and earn
            </p>
            <p className="mt-2 text-3xl font-black text-yellow-400">+50 pts</p>
          </div>

          <div className="mb-5 rounded-xl border border-slate-700 bg-slate-700/40 px-4 py-3 text-sm text-slate-300">
            <p>Checking in as <span className="font-semibold text-white">{user.name}</span></p>
          </div>

          <form action={handleCheckIn}>
            <button
              type="submit"
              className="w-full rounded-xl bg-green-600 py-4 text-base font-bold text-white hover:bg-green-500 transition-colors active:scale-95"
            >
              Check In Now
            </button>
          </form>

          <p className="mt-3 text-center text-xs text-slate-500">
            One check-in per center per day
          </p>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-slate-500">
        <Link href="/app/checkin/geo" className="text-slate-400 hover:text-white underline underline-offset-2 transition-colors">
          Or check in via GPS →
        </Link>
      </p>
    </div>
  )
}
