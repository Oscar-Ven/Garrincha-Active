import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createCenterQR, getCenterQRCodes, getCenterCheckIns } from '@/services/checkin'
import { QRCodeDisplay } from '@/components/ui/qr-code-display'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const center = await prisma.center.findUnique({ where: { id }, select: { name: true } })
  return { title: `${center?.name ?? 'Center'} QR — Admin` }
}

async function generateQR(centerId: string, formData: FormData) {
  'use server'
  const user = await getCurrentUser()
  if (!user || (user.role !== 'PLATFORM_ADMIN' && user.role !== 'CENTER_ADMIN')) return
  const label = (formData.get('label') as string | null)?.trim() || undefined
  await createCenterQR(centerId, user.id, label)
  revalidatePath(`/admin/centers/${centerId}`)
}

async function toggleQRActive(qrId: string, centerId: string, isActive: boolean) {
  'use server'
  const user = await getCurrentUser()
  if (!user || (user.role !== 'PLATFORM_ADMIN' && user.role !== 'CENTER_ADMIN')) return
  await prisma.centerQR.update({ where: { id: qrId }, data: { isActive: !isActive } })
  revalidatePath(`/admin/centers/${centerId}`)
}

export default async function CenterQRPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'PLATFORM_ADMIN' && user.role !== 'CENTER_ADMIN') redirect('/admin')

  const [center, qrCodes, recentCheckIns] = await Promise.all([
    prisma.center.findUnique({
      where: { id },
      select: { id: true, name: true, city: true, _count: { select: { players: true, checkIns: true } } },
    }),
    getCenterQRCodes(id),
    getCenterCheckIns(id, 20),
  ])

  if (!center) notFound()

  const generateQRForCenter = generateQR.bind(null, id)

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/centers" className="text-slate-400 hover:text-white text-sm">← Centers</Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{center.name}</h1>
          {center.city && <p className="text-sm text-slate-400">{center.city}</p>}
        </div>
        <div className="flex gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-white">{center._count.players}</p>
            <p className="text-xs text-slate-400">Players</p>
          </div>
          <div>
            <p className="text-lg font-bold text-green-400">{center._count.checkIns}</p>
            <p className="text-xs text-slate-400">Check-ins</p>
          </div>
        </div>
      </div>

      {/* Generate new QR */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Generate QR Code</h2>
        <form action={generateQRForCenter} className="flex gap-3">
          <input
            name="label"
            type="text"
            placeholder="Label (e.g. Main Entrance)"
            maxLength={60}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-600"
          />
          <button
            type="submit"
            className="rounded-xl bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
          >
            Generate
          </button>
        </form>
      </div>

      {/* QR Codes */}
      {qrCodes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">QR Codes ({qrCodes.length})</h2>
          {qrCodes.map((qr) => {
            const checkInUrl = `${BASE_URL}/app/checkin/${qr.token}`
            const toggleFn = toggleQRActive.bind(null, qr.id, id, qr.isActive)
            return (
              <div key={qr.id} className={`rounded-2xl border p-5 ${qr.isActive ? 'border-slate-700 bg-slate-800' : 'border-slate-700/50 bg-slate-800/50 opacity-60'}`}>
                <div className="flex gap-6 items-start">
                  {/* QR display */}
                  <div className="shrink-0">
                    <QRCodeDisplay value={checkInUrl} label={qr.label ?? undefined} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${qr.isActive ? 'bg-green-900/40 text-green-400' : 'bg-slate-700 text-slate-500'}`}>
                        {qr.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {qr.label && <span className="text-sm font-medium text-slate-200">{qr.label}</span>}
                    </div>

                    <div className="text-xs text-slate-500 font-mono break-all">{checkInUrl}</div>

                    <div className="flex gap-4 text-sm">
                      <span className="text-slate-400">{qr._count.checkIns} check-ins</span>
                      <span className="text-slate-500">
                        Created {new Date(qr.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <form action={toggleFn}>
                      <button type="submit" className="text-xs text-slate-400 hover:text-white transition-colors">
                        {qr.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Recent check-ins */}
      {recentCheckIns.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Recent Check-ins</h2>
          <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Player</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">When</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {recentCheckIns.map((ci) => (
                  <tr key={ci.id} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-200">{ci.user.name}</p>
                      <p className="text-xs text-slate-500">@{ci.user.nickname}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {new Date(ci.checkedInAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-yellow-400">
                      +{ci.pointsAwarded}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
