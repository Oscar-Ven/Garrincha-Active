'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ActivityType } from '@/generated/prisma'
import { LiveTrackingMap } from '@/components/maps/LiveTrackingMap'

// ─── Types ────────────────────────────────────────────────────────────────────

type RecordingState = 'IDLE' | 'REQUESTING_GPS' | 'RECORDING' | 'PAUSED' | 'FINISHING'

type GeoPoint = {
  lat: number; lng: number
  alt: number | null; speed: number | null; accuracy: number | null
  timestamp: string
}

type PathPoint = { lat: number; lng: number }

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVITY_TYPES: { value: ActivityType; label: string; icon: string }[] = [
  { value: ActivityType.RUN,               label: 'Run',      icon: '🏃' },
  { value: ActivityType.WALK,              label: 'Walk',     icon: '🚶' },
  { value: ActivityType.CYCLING,           label: 'Cycling',  icon: '🚴' },
  { value: ActivityType.FOOTBALL_MATCH,    label: 'Match',    icon: '🏟️' },
  { value: ActivityType.FOOTBALL_TRAINING, label: 'Training', icon: '⚽' },
  { value: ActivityType.FITNESS,           label: 'Fitness',  icon: '💪' },
]

const SEND_INTERVAL_MS = 5000
const MAX_GPS_JUMP_KM = 0.5 // ignore positions that jump more than 500m between readings

// ─── Haversine ────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function formatDuration(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatPace(paceMinPerKm: number) {
  const m = Math.floor(paceMinPerKm)
  const s = Math.round((paceMinPerKm - m) * 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LiveTracker() {
  const router = useRouter()

  const [recordingState, setRecordingState] = useState<RecordingState>('IDLE')
  const [activityType, setActivityType] = useState<ActivityType>(ActivityType.RUN)
  const [path, setPath] = useState<PathPoint[]>([])
  const [currentPos, setCurrentPos] = useState<PathPoint | null>(null)
  const [distanceKm, setDistanceKm] = useState(0)
  const [elapsedSecs, setElapsedSecs] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Stable refs so callbacks don't go stale
  const sessionIdRef = useRef<string | null>(null)
  const recordingStateRef = useRef<RecordingState>('IDLE')
  const pendingPointsRef = useRef<GeoPoint[]>([])
  const lastPathPointRef = useRef<PathPoint | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const sendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Keep state ref in sync
  useEffect(() => { recordingStateRef.current = recordingState }, [recordingState])

  // Duration timer
  useEffect(() => {
    if (recordingState === 'RECORDING') {
      durationTimerRef.current = setInterval(() => setElapsedSecs((s) => s + 1), 1000)
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current)
    }
    return () => { if (durationTimerRef.current) clearInterval(durationTimerRef.current) }
  }, [recordingState])

  // Flush pending points to server
  const flushPoints = useCallback(async () => {
    if (!sessionIdRef.current || pendingPointsRef.current.length === 0) return
    const batch = [...pendingPointsRef.current]
    pendingPointsRef.current = []
    try {
      await fetch(`/api/activities/live/${sessionIdRef.current}/points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: batch }),
      })
    } catch {
      // Put points back if the request fails
      pendingPointsRef.current = [...batch, ...pendingPointsRef.current]
    }
  }, [])

  // Handle incoming GPS position
  const onPosition = useCallback((pos: GeolocationPosition) => {
    if (recordingStateRef.current !== 'RECORDING') return

    const { latitude: lat, longitude: lng, altitude: alt, speed, accuracy } = pos.coords
    const point: GeoPoint = {
      lat, lng,
      alt: alt ?? null,
      speed: speed ?? null,
      accuracy: accuracy ?? null,
      timestamp: new Date(pos.timestamp).toISOString(),
    }

    setCurrentPos({ lat, lng })

    // Update path + distance
    const last = lastPathPointRef.current
    if (last) {
      const d = haversineKm(last.lat, last.lng, lat, lng)
      if (d < MAX_GPS_JUMP_KM && d > 0) {
        setDistanceKm((prev) => prev + d)
      }
    }
    lastPathPointRef.current = { lat, lng }
    setPath((prev) => [...prev, { lat, lng }])

    pendingPointsRef.current.push(point)
  }, [])

  const onGpsError = useCallback((e: GeolocationPositionError) => {
    setError(`GPS: ${e.message}`)
  }, [])

  // ─── Controls ───────────────────────────────────────────────────────────────

  const startGpsWatch = useCallback(() => {
    watchIdRef.current = navigator.geolocation.watchPosition(onPosition, onGpsError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    })
    sendTimerRef.current = setInterval(flushPoints, SEND_INTERVAL_MS)
  }, [flushPoints, onGpsError, onPosition])

  const stopGpsWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (sendTimerRef.current) {
      clearInterval(sendTimerRef.current)
      sendTimerRef.current = null
    }
  }, [])

  const startRecording = async () => {
    if (!navigator.geolocation) {
      setError('GPS is not supported on this browser.')
      return
    }
    setError(null)
    setRecordingState('REQUESTING_GPS')

    try {
      const res = await fetch('/api/activities/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activityType }),
      })
      if (!res.ok) throw new Error('Failed to start session')
      const { sessionId } = await res.json()
      sessionIdRef.current = sessionId
      startGpsWatch()
      setRecordingState('RECORDING')
    } catch {
      setError('Could not start recording. Please try again.')
      setRecordingState('IDLE')
    }
  }

  const pauseRecording = () => {
    stopGpsWatch()
    flushPoints()
    setRecordingState('PAUSED')
  }

  const resumeRecording = () => {
    startGpsWatch()
    setRecordingState('RECORDING')
  }

  const finishRecording = async () => {
    stopGpsWatch()
    if (durationTimerRef.current) clearInterval(durationTimerRef.current)
    setRecordingState('FINISHING')

    await flushPoints()

    if (!sessionIdRef.current) return

    try {
      const res = await fetch(`/api/activities/live/${sessionIdRef.current}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activityType, durationSecs: elapsedSecs }),
      })
      if (!res.ok) throw new Error('Failed to save activity')
      const { activityId } = await res.json()
      router.push(`/app/activities/${activityId}`)
    } catch {
      setError('Failed to save your activity. Please try again.')
      setRecordingState('PAUSED')
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopGpsWatch()
      if (durationTimerRef.current) clearInterval(durationTimerRef.current)
    }
  }, [stopGpsWatch])

  // ─── Derived stats ──────────────────────────────────────────────────────────

  const paceMinPerKm = distanceKm > 0.05 && elapsedSecs > 0
    ? (elapsedSecs / 60) / distanceKm
    : null

  // ─── Render: IDLE ───────────────────────────────────────────────────────────

  if (recordingState === 'IDLE' || recordingState === 'REQUESTING_GPS') {
    return (
      <div className="mx-auto max-w-sm space-y-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Record Activity</h1>
          <p className="mt-1 text-sm text-slate-400">Live GPS tracking via your device</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Activity type</p>
          <div className="grid grid-cols-3 gap-2">
            {ACTIVITY_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setActivityType(t.value)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-4 text-xs font-semibold transition-colors ${
                  activityType === t.value
                    ? 'border-green-500 bg-green-500/10 text-green-400'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <span className="text-2xl">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={startRecording}
          disabled={recordingState === 'REQUESTING_GPS'}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 py-5 text-lg font-bold text-white transition-colors hover:bg-green-500 active:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {recordingState === 'REQUESTING_GPS' ? (
            <>
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Starting…
            </>
          ) : (
            <>
              <span className="h-3 w-3 rounded-full bg-red-400" />
              Start Recording
            </>
          )}
        </button>

        <p className="text-center text-xs text-slate-600">
          Keep the screen on while recording. GPS accuracy improves after a few seconds outdoors.
        </p>
      </div>
    )
  }

  // ─── Render: FINISHING ──────────────────────────────────────────────────────

  if (recordingState === 'FINISHING') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-green-500" />
        <p className="font-semibold text-slate-300">Saving your activity…</p>
      </div>
    )
  }

  // ─── Render: RECORDING / PAUSED ─────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          {error}
        </div>
      )}

      {/* Status pill */}
      <div className="flex items-center gap-2">
        {recordingState === 'RECORDING' ? (
          <span className="flex items-center gap-2 text-sm font-semibold text-red-400">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            Recording
          </span>
        ) : (
          <span className="flex items-center gap-2 text-sm font-semibold text-amber-400">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            Paused
          </span>
        )}
        <span className="ml-auto text-xs text-slate-500">{path.length} GPS points</span>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Distance</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-white">{distanceKm.toFixed(2)}</p>
          <p className="text-xs text-slate-500">km</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Duration</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-white">{formatDuration(elapsedSecs)}</p>
          <p className="text-xs text-slate-500">elapsed</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Pace</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-white">
            {paceMinPerKm ? formatPace(paceMinPerKm) : '—'}
          </p>
          <p className="text-xs text-slate-500">min/km</p>
        </div>
      </div>

      {/* Live map */}
      <div className="h-[300px] overflow-hidden rounded-2xl border border-slate-700">
        <LiveTrackingMap path={path} currentPos={currentPos} />
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        {recordingState === 'RECORDING' ? (
          <button
            onClick={pauseRecording}
            className="flex-1 rounded-xl border border-amber-500/50 bg-amber-500/10 py-4 text-sm font-bold text-amber-400 transition-colors hover:bg-amber-500/20"
          >
            ⏸ Pause
          </button>
        ) : (
          <button
            onClick={resumeRecording}
            className="flex-1 rounded-xl border border-green-500/50 bg-green-500/10 py-4 text-sm font-bold text-green-400 transition-colors hover:bg-green-500/20"
          >
            ▶ Resume
          </button>
        )}
        <button
          onClick={finishRecording}
          className="flex-1 rounded-xl bg-green-600 py-4 text-sm font-bold text-white transition-colors hover:bg-green-500"
        >
          ⬛ Finish &amp; Save
        </button>
      </div>

      <p className="text-center text-xs text-slate-600">
        Keep your screen on. GPS data is saved automatically every 5 seconds.
      </p>
    </div>
  )
}
