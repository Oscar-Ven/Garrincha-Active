'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ActivityType } from '@/generated/prisma'
import { cn } from '@/lib/utils'
import { RouteBuilderMap } from '@/components/maps/RouteBuilderMap'

const TYPE_OPTIONS: { value: ActivityType; label: string; icon: string }[] = [
  { value: ActivityType.RUN, label: 'Running', icon: '🏃' },
  { value: ActivityType.WALK, label: 'Walking', icon: '🚶' },
  { value: ActivityType.CYCLING, label: 'Cycling', icon: '🚴' },
  { value: ActivityType.FOOTBALL_TRAINING, label: 'Football', icon: '⚽' },
  { value: ActivityType.FITNESS, label: 'Fitness', icon: '💪' },
  { value: ActivityType.CUSTOM, label: 'Other', icon: '🎯' },
]

const DIFFICULTY_OPTIONS = ['EASY', 'MODERATE', 'HARD', 'EXTREME'] as const
const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  EASY: { label: 'Easy', color: 'text-green-400' },
  MODERATE: { label: 'Moderate', color: 'text-blue-400' },
  HARD: { label: 'Hard', color: 'text-orange-400' },
  EXTREME: { label: 'Extreme', color: 'text-red-400' },
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

type MapWaypoint = { lat: number; lng: number }

export default function NewRoutePage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [type, setType] = useState<ActivityType>(ActivityType.RUN)
  const [difficulty, setDifficulty] = useState<string>('MODERATE')
  const [waypoints, setWaypoints] = useState<MapWaypoint[]>([])
  const [distKm, setDistKm] = useState('')
  const [elevationM, setElevationM] = useState('')
  const [error, setError] = useState('')

  // Auto-compute distance when waypoints change
  useEffect(() => {
    if (waypoints.length >= 2) {
      let d = 0
      for (let i = 1; i < waypoints.length; i++) {
        d += haversine(waypoints[i - 1].lat, waypoints[i - 1].lng, waypoints[i].lat, waypoints[i].lng)
      }
      setDistKm(d.toFixed(2))
    } else {
      setDistKm('')
    }
  }, [waypoints])

  function handleAddPoint(lat: number, lng: number) {
    setWaypoints((w) => [...w, { lat, lng }])
  }

  function handleRemovePoint(i: number) {
    setWaypoints((w) => w.filter((_, idx) => idx !== i))
  }

  function handleClear() {
    setWaypoints([])
    setDistKm('')
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = e.currentTarget
    const data = new FormData(form)

    if (waypoints.length < 2) {
      setError('Click at least 2 points on the map to define a route.')
      return
    }

    const parsedDist = parseFloat(distKm)
    if (!parsedDist || parsedDist <= 0) {
      setError('Distance could not be calculated. Add more waypoints.')
      return
    }

    startTransition(async () => {
      const res = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.get('title'),
          description: data.get('description') || undefined,
          type,
          distanceKm: parsedDist,
          elevationM: elevationM ? parseFloat(elevationM) : undefined,
          difficulty,
          waypoints: waypoints.map((wp, i) => ({
            sequence: i + 1,
            lat: wp.lat,
            lng: wp.lng,
          })),
        }),
      })
      const result = await res.json()
      if (result.error) { setError(result.error); return }
      router.push(`/app/routes/${result.id}`)
    })
  }

  const inputCls =
    'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50'

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Create Route</h1>
          <p className="text-xs text-slate-400">Click on the map to trace your route</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-700/40 bg-red-900/15 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Interactive map */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-300">Draw Route</span>
              {waypoints.length > 0 && (
                <span className="rounded-full border border-green-600/30 bg-green-600/10 px-2 py-0.5 text-xs text-green-400">
                  {waypoints.length} point{waypoints.length !== 1 ? 's' : ''}
                  {distKm ? ` · ${distKm} km` : ''}
                </span>
              )}
            </div>
            {waypoints.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="h-80">
            <RouteBuilderMap
              waypoints={waypoints}
              onAddPoint={handleAddPoint}
              onRemovePoint={handleRemovePoint}
            />
          </div>

          <div className="border-t border-slate-700 px-4 py-2.5">
            <p className="text-xs text-slate-500">
              Click anywhere on the map to add a waypoint. Click a waypoint marker to remove it.
            </p>
          </div>
        </div>

        {/* Sport type */}
        <div>
          <p className="mb-2.5 text-sm font-medium text-slate-300">Sport Type</p>
          <div className="grid grid-cols-3 gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-center transition-all active:scale-95',
                  type === opt.value
                    ? 'border-green-600/50 bg-green-900/20 text-green-300 ring-2 ring-green-600/40'
                    : 'border-slate-700 bg-slate-800/40 text-slate-500 hover:border-slate-500 hover:text-slate-300',
                )}
              >
                <span className="text-xl">{opt.icon}</span>
                <span className="text-xs font-semibold">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Core fields */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Route Name</label>
            <input
              name="title"
              type="text"
              placeholder="e.g. Corniche Loop — 10km"
              maxLength={100}
              required
              disabled={isPending}
              className={inputCls}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">
              Description <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <textarea
              name="description"
              rows={2}
              maxLength={500}
              placeholder="What's special about this route?"
              disabled={isPending}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">
                Distance (km)
                <span className="ml-1 text-xs font-normal text-green-400">auto</span>
              </label>
              <input
                type="number"
                min={0.01}
                step={0.01}
                max={500}
                value={distKm}
                onChange={(e) => setDistKm(e.target.value)}
                placeholder="Draw route to calculate"
                required
                disabled={isPending}
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">
                Elevation (m) <span className="text-slate-500 font-normal">opt.</span>
              </label>
              <input
                type="number"
                min={0}
                step={1}
                max={8000}
                value={elevationM}
                onChange={(e) => setElevationM(e.target.value)}
                placeholder="120"
                disabled={isPending}
                className={inputCls}
              />
            </div>
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Difficulty</label>
            <div className="flex gap-2">
              {DIFFICULTY_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={cn(
                    'flex-1 rounded-lg border py-2 text-xs font-semibold transition-all',
                    difficulty === d
                      ? `border-current ${DIFFICULTY_LABELS[d].color} bg-white/5`
                      : 'border-slate-700 text-slate-500 hover:border-slate-500',
                  )}
                >
                  {DIFFICULTY_LABELS[d].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 px-1">
          Your route will be public and visible to all players.
        </p>

        <div className="flex gap-3 pb-2">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isPending}
            className="flex-1 rounded-xl border border-slate-700 py-3 text-sm font-medium text-slate-400 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || waypoints.length < 2}
            className="flex-2 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-500 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Creating…' : 'Create Route'}
          </button>
        </div>
      </form>
    </div>
  )
}
