import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { getGear, retireGear, unretireGear, deleteGear } from '@/services/gear'
import { prisma } from '@/lib/db'
import { GearType, ActivityType } from '@/generated/prisma'
import { activityTypeIcon } from '@/lib/utils'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return { title: 'Gear' }
  const gear = await getGear(id, user.id)
  return { title: gear ? `${gear.name} | Gear` : 'Gear' }
}

const GEAR_ICONS: Record<GearType, string> = { SHOES: '👟', BIKE: '🚴', WETSUIT: '🏊', OTHER: '⚙️' }
const GEAR_LABELS: Record<GearType, string> = { SHOES: 'Shoes', BIKE: 'Bike', WETSUIT: 'Wetsuit', OTHER: 'Other' }

export default async function GearDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const [gear, maintenanceLogs] = await Promise.all([
    getGear(id, user.id),
    prisma.gearMaintenance.findMany({
      where: { gear: { id, userId: user.id } },
      orderBy: { performedAt: 'desc' },
    }),
  ])
  if (!gear) notFound()

  const pct = gear.alertThresholdKm
    ? Math.min(100, Math.round((gear.totalDistanceKm / gear.alertThresholdKm) * 100))
    : null

  async function handleRetire() {
    'use server'
    const u = await getCurrentUser()
    if (!u) redirect('/login')
    await retireGear(id, u.id)
    revalidatePath(`/app/gear/${id}`)
  }

  async function handleUnretire() {
    'use server'
    const u = await getCurrentUser()
    if (!u) redirect('/login')
    await unretireGear(id, u.id)
    revalidatePath(`/app/gear/${id}`)
  }

  async function addGearMaintenance(formData: FormData) {
    'use server'
    const u = await getCurrentUser()
    if (!u) redirect('/login')
    // Verify ownership
    const g = await prisma.gear.findFirst({ where: { id, userId: u.id } })
    if (!g) return

    const title = (formData.get('maintTitle') as string | null)?.trim()
    if (!title) return

    const performedAtRaw = formData.get('performedAt') as string | null
    const performedAt = performedAtRaw ? new Date(performedAtRaw) : new Date()

    const distanceRaw = formData.get('distanceAtKm') as string | null
    const distanceAtKm = distanceRaw ? parseFloat(distanceRaw) : null

    const costRaw = formData.get('costAmount') as string | null
    const costAmount = costRaw ? parseFloat(costRaw) : null

    const description = (formData.get('maintDescription') as string | null)?.trim() || null

    await prisma.gearMaintenance.create({
      data: {
        gearId: id,
        title,
        performedAt,
        distanceAtKm,
        costAmount,
        description,
      },
    })

    revalidatePath(`/app/gear/${id}`)
  }

  async function handleDelete() {
    'use server'
    const u = await getCurrentUser()
    if (!u) redirect('/login')
    const g = await getGear(id, u.id)
    if (!g || g._count.activities > 0) return
    await deleteGear(id, u.id)
    redirect('/app/gear')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back */}
      <Link href="/app/gear" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        Back to Gear
      </Link>

      {/* Gear card */}
      <div className={`rounded-2xl border p-6 ${gear.isRetired ? 'border-slate-700/50 bg-slate-800/50 opacity-75' : 'border-slate-700 bg-slate-800'}`}>
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-700 text-4xl">
            {GEAR_ICONS[gear.type]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white">{gear.name}</h1>
              {gear.isRetired && (
                <span className="rounded-full bg-slate-700 px-2.5 py-0.5 text-xs font-semibold text-slate-400">Retired</span>
              )}
            </div>
            <p className="text-sm text-slate-400">
              {GEAR_LABELS[gear.type]}
              {gear.brand ? ` · ${gear.brand}` : ''}
              {gear.model ? ` ${gear.model}` : ''}
            </p>
            {gear.purchasedAt && (
              <p className="text-xs text-slate-500 mt-1">
                Purchased {new Date(gear.purchasedAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {/* Mileage */}
        <div className="mt-5 pt-5 border-t border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-3xl font-bold text-white">{gear.totalDistanceKm.toFixed(1)} km</p>
              <p className="text-xs text-slate-400">total distance · {gear._count.activities} activities</p>
            </div>
            {gear.alertThresholdKm && (
              <div className="text-right">
                <p className="text-sm text-slate-400">Limit: {gear.alertThresholdKm} km</p>
                <p className={`text-sm font-semibold ${pct! >= 100 ? 'text-red-400' : pct! >= 85 ? 'text-amber-400' : 'text-green-400'}`}>
                  {pct}% used
                </p>
              </div>
            )}
          </div>

          {pct != null && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
              <div
                className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : pct >= 85 ? 'bg-amber-500' : 'bg-green-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}

          {pct != null && pct >= 85 && (
            <p className="mt-2 text-xs text-amber-400">
              {pct >= 100 ? '⚠️ This gear has exceeded its distance limit — consider replacing it.' : `⚠️ ${Math.round((1 - pct / 100) * gear.alertThresholdKm!)} km remaining before limit.`}
            </p>
          )}
        </div>

        {gear.notes && (
          <div className="mt-4 rounded-xl bg-slate-700/40 px-4 py-3 text-sm text-slate-300">
            {gear.notes}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-700 pt-5">
          {gear.isRetired ? (
            <form action={handleUnretire}>
              <button type="submit" className="rounded-lg border border-green-600/40 bg-green-600/10 px-4 py-2 text-sm font-medium text-green-400 hover:bg-green-600/20 transition-colors">
                Reactivate
              </button>
            </form>
          ) : (
            <form action={handleRetire}>
              <button type="submit" className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:border-slate-400 hover:text-white transition-colors">
                Retire
              </button>
            </form>
          )}
          {gear._count.activities === 0 && (
            <form action={handleDelete}>
              <button type="submit" className="rounded-lg border border-red-700/40 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-900/20 transition-colors">
                Delete
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Recent activities */}
      {gear.activities.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Activities</h2>
          <div className="space-y-2">
            {gear.activities.map((a) => (
              <Link key={a.id} href={`/app/activities/${a.id}`} className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 hover:bg-slate-700 transition-colors">
                <span className="text-lg">{activityTypeIcon(a.type as ActivityType)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{a.title}</p>
                  {a.distanceKm != null && <p className="text-xs text-slate-400">{a.distanceKm.toFixed(1)} km</p>}
                </div>
                <p className="shrink-0 text-xs text-slate-500">
                  {new Date(a.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
              </Link>
            ))}
            {gear._count.activities > gear.activities.length && (
              <p className="text-xs text-slate-500 text-center py-1">+{gear._count.activities - gear.activities.length} more activities</p>
            )}
          </div>
        </div>
      )}

      {/* Maintenance Log */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Maintenance Log {maintenanceLogs.length > 0 && `(${maintenanceLogs.length})`}
        </h2>

        {maintenanceLogs.length > 0 && (
          <div className="mb-4 space-y-2">
            {maintenanceLogs.map((log) => (
              <div key={log.id} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-white text-sm">{log.title}</p>
                  <p className="shrink-0 text-xs text-slate-500">
                    {new Date(log.performedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-400">
                  {log.distanceAtKm != null && <span>At {log.distanceAtKm.toFixed(0)} km</span>}
                  {log.costAmount != null && <span>€{log.costAmount.toFixed(2)}</span>}
                </div>
                {log.description && (
                  <p className="mt-1.5 text-xs text-slate-500">{log.description}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Log Maintenance form */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-4">
          <h3 className="mb-3 text-sm font-medium text-slate-300">Log Maintenance</h3>
          <form action={addGearMaintenance} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-slate-400">Title <span className="text-red-400">*</span></label>
                <input
                  name="maintTitle"
                  type="text"
                  required
                  maxLength={100}
                  placeholder="e.g. Tyre change"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Date performed <span className="text-red-400">*</span></label>
                <input
                  name="performedAt"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Distance at time (km)</label>
                <input
                  name="distanceAtKm"
                  type="number"
                  min={0}
                  step="0.1"
                  defaultValue={gear.totalDistanceKm > 0 ? gear.totalDistanceKm.toFixed(1) : ''}
                  placeholder="e.g. 1250"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Cost (€)</label>
                <input
                  name="costAmount"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="e.g. 29.99"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-slate-400">Notes (optional)</label>
                <textarea
                  name="maintDescription"
                  rows={2}
                  maxLength={500}
                  placeholder="Additional details…"
                  className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-slate-700 py-2.5 text-sm font-medium text-white hover:bg-slate-600 transition-colors"
            >
              Save Maintenance Record
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
