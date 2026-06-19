import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { getUserGear } from '@/services/gear'
import { GearType } from '@/generated/prisma'

const GEAR_ICONS: Record<GearType, string> = { SHOES: '👟', BIKE: '🚴', WETSUIT: '🏊', OTHER: '⚙️' }
const GEAR_LABELS: Record<GearType, string> = { SHOES: 'Shoes', BIKE: 'Bike', WETSUIT: 'Wetsuit', OTHER: 'Other' }

export const metadata = { title: 'My Gear | Garrincha Active' }

export default async function GearPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const gear = await getUserGear(user.id)
  const active = gear.filter((g) => !g.isRetired)
  const retired = gear.filter((g) => g.isRetired)

  function alertStatus(g: (typeof gear)[0]) {
    if (!g.alertThresholdKm || g.isRetired) return null
    const pct = (g.totalDistanceKm / g.alertThresholdKm) * 100
    if (pct >= 100) return 'over'
    if (pct >= 85) return 'warn'
    return null
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Gear</h1>
          <p className="text-sm text-slate-400">Track mileage on your shoes, bikes, and equipment</p>
        </div>
        <Link
          href="/app/gear/new"
          className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
        >
          + Add Gear
        </Link>
      </div>

      {gear.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/30 py-16 text-center">
          <p className="text-4xl mb-3">👟</p>
          <p className="font-semibold text-white">No gear yet</p>
          <p className="mt-1 text-sm text-slate-400">Add your shoes and bikes to track their mileage</p>
          <Link href="/app/gear/new" className="mt-4 inline-block rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-500">
            Add First Item
          </Link>
        </div>
      )}

      {/* Active gear */}
      {active.length > 0 && (
        <div className="space-y-3">
          {active.map((g) => {
            const status = alertStatus(g)
            const pct = g.alertThresholdKm ? Math.min(100, Math.round((g.totalDistanceKm / g.alertThresholdKm) * 100)) : null

            return (
              <Link key={g.id} href={`/app/gear/${g.id}`} className="block rounded-2xl border border-slate-700 bg-slate-800 p-5 hover:border-slate-500 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-700 text-2xl">
                    {GEAR_ICONS[g.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white truncate">{g.name}</p>
                      {status === 'over' && (
                        <span className="shrink-0 rounded-full bg-red-900/40 px-2 py-0.5 text-xs font-semibold text-red-400">Replace!</span>
                      )}
                      {status === 'warn' && (
                        <span className="shrink-0 rounded-full bg-amber-900/40 px-2 py-0.5 text-xs font-semibold text-amber-400">High mileage</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{GEAR_LABELS[g.type]}{g.brand ? ` · ${g.brand}` : ''}{g.model ? ` ${g.model}` : ''}</p>

                    <div className="mt-3 flex items-center gap-4 text-sm">
                      <span className="font-semibold text-white">{g.totalDistanceKm.toFixed(0)} km</span>
                      {g.alertThresholdKm && (
                        <span className="text-slate-500">/ {g.alertThresholdKm} km limit</span>
                      )}
                      <span className="text-slate-500">{g._count.activities} activities</span>
                    </div>

                    {pct != null && (
                      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                        <div
                          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : pct >= 85 ? 'bg-amber-500' : 'bg-green-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Retired gear */}
      {retired.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Retired</h2>
          <div className="space-y-2">
            {retired.map((g) => (
              <Link key={g.id} href={`/app/gear/${g.id}`} className="flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-3 opacity-60 hover:opacity-80 transition-opacity">
                <span className="text-xl">{GEAR_ICONS[g.type]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-300 truncate">{g.name}</p>
                  <p className="text-xs text-slate-500">{g.totalDistanceKm.toFixed(0)} km total</p>
                </div>
                <span className="text-xs text-slate-600">Retired</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
