'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ActivityType } from '@/generated/prisma'
import { cn } from '@/lib/utils'
import { importGPXAction, type ImportGPXState } from './actions'

// ── GPX parsing ──────────────────────────────────────────────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function detectType(raw: string): ActivityType {
  const t = raw.toLowerCase().trim()
  if (t.includes('run') || t === '1') return ActivityType.RUN
  if (t.includes('cycl') || t.includes('bike') || t === '2') return ActivityType.CYCLING
  if (t.includes('walk') || t === '3') return ActivityType.WALK
  if (t.includes('football') || t.includes('soccer')) return ActivityType.FOOTBALL_TRAINING
  if (t.includes('fitness') || t.includes('gym')) return ActivityType.FITNESS
  return ActivityType.CUSTOM
}

type RawPoint = { lat: number; lng: number; alt: number | null; time: string | null }

type ParsedGPX = {
  title: string
  type: ActivityType
  startedAt: string
  durationMinutes: number
  distanceKm: number
  heartRateAvg?: number
  cadence?: number
  temperature?: number
  rawPoints: RawPoint[]
}

function samplePoints(arr: Element[], max: number): Element[] {
  if (arr.length <= max) return arr
  const step = Math.ceil(arr.length / max)
  const sampled = arr.filter((_, i) => i % step === 0)
  if (sampled[sampled.length - 1] !== arr[arr.length - 1]) sampled.push(arr[arr.length - 1])
  return sampled
}

function parseGPX(xml: string): ParsedGPX {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const title =
    doc.querySelector('trk > name')?.textContent?.trim() ||
    doc.querySelector('metadata > name')?.textContent?.trim() ||
    'GPX Import'
  const gpxType = doc.querySelector('trk > type')?.textContent?.trim() ?? ''
  const type = detectType(gpxType)
  const pts = Array.from(doc.getElementsByTagName('trkpt'))

  let distKm = 0, hrSum = 0, hrN = 0, cadSum = 0, cadN = 0, tempSum = 0, tempN = 0

  for (let i = 0; i < pts.length; i++) {
    const pt = pts[i]
    const lat = parseFloat(pt.getAttribute('lat') ?? '0')
    const lon = parseFloat(pt.getAttribute('lon') ?? '0')
    if (i > 0) {
      const prev = pts[i - 1]
      distKm += haversine(
        parseFloat(prev.getAttribute('lat') ?? '0'),
        parseFloat(prev.getAttribute('lon') ?? '0'),
        lat,
        lon,
      )
    }
    const hrEl = pt.querySelector('hr') ?? pt.querySelector('heartrate')
    if (hrEl?.textContent) { hrSum += parseFloat(hrEl.textContent); hrN++ }
    const cadEl = pt.querySelector('cad') ?? pt.querySelector('cadence')
    if (cadEl?.textContent) { cadSum += parseFloat(cadEl.textContent); cadN++ }
    const tempEl = pt.querySelector('atemp') ?? pt.querySelector('temperature')
    if (tempEl?.textContent) { tempSum += parseFloat(tempEl.textContent); tempN++ }
  }

  const firstTime = pts[0]?.querySelector('time')?.textContent ?? ''
  const lastTime = pts[pts.length - 1]?.querySelector('time')?.textContent ?? ''
  const start = firstTime ? new Date(firstTime) : new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const startedAt = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T${pad(start.getHours())}:${pad(start.getMinutes())}`
  const durationMinutes =
    firstTime && lastTime
      ? Math.max(1, Math.round((new Date(lastTime).getTime() - start.getTime()) / 60000))
      : 30

  // Sample to max 500 points for storage
  const sampled = samplePoints(pts, 500)
  const rawPoints: RawPoint[] = sampled.map((pt) => ({
    lat: parseFloat(pt.getAttribute('lat') ?? '0'),
    lng: parseFloat(pt.getAttribute('lon') ?? '0'),
    alt: pt.querySelector('ele')?.textContent ? parseFloat(pt.querySelector('ele')!.textContent!) : null,
    time: pt.querySelector('time')?.textContent ?? null,
  }))

  return {
    title,
    type,
    startedAt,
    durationMinutes,
    distanceKm: Math.round(distKm * 100) / 100,
    heartRateAvg: hrN > 0 ? Math.round(hrSum / hrN) : undefined,
    cadence: cadN > 0 ? Math.round(cadSum / cadN) : undefined,
    temperature: tempN > 0 ? Math.round((tempSum / tempN) * 10) / 10 : undefined,
    rawPoints,
  }
}

// ── Config ───────────────────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: ActivityType; label: string; icon: string }[] = [
  { value: ActivityType.RUN, label: 'Run', icon: '🏃' },
  { value: ActivityType.WALK, label: 'Walk', icon: '🚶' },
  { value: ActivityType.CYCLING, label: 'Cycling', icon: '🚴' },
  { value: ActivityType.FOOTBALL_TRAINING, label: 'Training', icon: '⚽' },
  { value: ActivityType.FITNESS, label: 'Fitness', icon: '💪' },
  { value: ActivityType.CUSTOM, label: 'Other', icon: '🎯' },
]

const INITIAL: ImportGPXState = {}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ImportGPXPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParsedGPX | null>(null)
  const [selectedType, setSelectedType] = useState<ActivityType>(ActivityType.RUN)
  const [parseError, setParseError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [state, formAction, isPending] = useActionState(importGPXAction, INITIAL)

  useEffect(() => {
    if (parsed) setSelectedType(parsed.type)
  }, [parsed])

  function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.gpx')) {
      setParseError('Please select a .gpx file.')
      return
    }
    setParseError('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const result = parseGPX(ev.target?.result as string)
        setParsed(result)
      } catch {
        setParseError('Failed to parse GPX file — the file may be corrupt or unsupported.')
      }
    }
    reader.readAsText(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const inputCls =
    'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50'

  return (
    <div className="mx-auto max-w-lg">
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
          <h1 className="text-xl font-bold text-white">Import GPX</h1>
          <p className="text-xs text-slate-400">Upload a .gpx file from Garmin, Strava, or any GPS device</p>
        </div>
      </div>

      {!parsed ? (
        /* ── Upload step ──────────────────────────────────────── */
        <div className="space-y-4">
          {parseError && (
            <div className="rounded-xl border border-red-700/40 bg-red-900/15 px-4 py-3 text-sm text-red-300">
              {parseError}
            </div>
          )}

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              'flex w-full flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors',
              isDragOver
                ? 'border-green-500 bg-green-900/10'
                : 'border-slate-600 bg-slate-800/30 hover:border-slate-500 hover:bg-slate-800/50',
            )}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <div>
              <p className="font-semibold text-white">Drop your GPX file here</p>
              <p className="mt-1 text-sm text-slate-400">or tap to browse</p>
            </div>
            <span className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white">
              Choose File
            </span>
          </button>
          <input ref={fileRef} type="file" accept=".gpx" className="hidden" onChange={handleFileInput} />

          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
            <p className="mb-2 text-xs font-semibold text-slate-400">Supported apps</p>
            <div className="flex flex-wrap gap-2">
              {['Garmin Connect', 'Strava', 'Wahoo', 'Polar', 'Suunto', 'Apple Watch', 'Google Maps'].map((app) => (
                <span key={app} className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-500">
                  {app}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── Preview + edit step ─────────────────────────────── */
        <form action={formAction} className="space-y-5">
          {state.error && (
            <div className="rounded-xl border border-red-700/40 bg-red-900/15 px-4 py-3 text-sm text-red-300">
              {state.error}
            </div>
          )}

          {/* Success banner */}
          <div className="flex items-center justify-between rounded-xl border border-green-700/40 bg-green-900/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-green-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              GPX parsed — review and confirm
            </div>
            <button
              type="button"
              onClick={() => { setParsed(null); setParseError('') }}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Change file
            </button>
          </div>

          {/* Hidden route points for server action */}
          <input type="hidden" name="routePointsJson" value={JSON.stringify(parsed.rawPoints)} />

          {/* Sport type */}
          <div>
            <p className="mb-2.5 text-sm font-medium text-slate-300">Sport Type</p>
            <input type="hidden" name="type" value={selectedType} />
            <div className="grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedType(opt.value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-center transition-all active:scale-95',
                    selectedType === opt.value
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
              <label className="text-sm font-medium text-slate-300">Title</label>
              <input
                name="title"
                type="text"
                defaultValue={parsed.title}
                maxLength={100}
                required
                disabled={isPending}
                className={inputCls}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Date &amp; Time</label>
              <input
                name="startedAt"
                type="datetime-local"
                defaultValue={parsed.startedAt}
                required
                disabled={isPending}
                className={`${inputCls} scheme-dark`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Duration (min)</label>
                <input
                  name="durationMinutes"
                  type="number"
                  min={1}
                  max={1440}
                  defaultValue={parsed.durationMinutes}
                  required
                  disabled={isPending}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Distance (km)</label>
                <input
                  name="distanceKm"
                  type="number"
                  step="0.01"
                  min={0}
                  defaultValue={parsed.distanceKm > 0 ? parsed.distanceKm : ''}
                  disabled={isPending}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">
                Notes <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <textarea
                name="description"
                rows={2}
                maxLength={500}
                defaultValue="Imported from GPX file"
                disabled={isPending}
                className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Biometric data extracted from GPX */}
          {(parsed.heartRateAvg != null || parsed.cadence != null || parsed.temperature != null) && (
            <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4 space-y-4">
              <p className="text-sm font-medium text-slate-300">
                Biometric Data{' '}
                <span className="ml-1 text-xs font-normal text-green-400">extracted from GPX</span>
              </p>
              <div className="grid grid-cols-3 gap-3">
                {parsed.heartRateAvg != null && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">Avg HR (bpm)</label>
                    <input name="heartRateAvg" type="number" defaultValue={parsed.heartRateAvg} disabled={isPending} className={inputCls} />
                  </div>
                )}
                {parsed.cadence != null && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">Cadence (rpm)</label>
                    <input name="cadence" type="number" defaultValue={parsed.cadence} disabled={isPending} className={inputCls} />
                  </div>
                )}
                {parsed.temperature != null && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">Temp (°C)</label>
                    <input name="temperature" type="number" step="0.1" defaultValue={parsed.temperature} disabled={isPending} className={inputCls} />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pb-2">
            <button
              type="button"
              onClick={() => setParsed(null)}
              disabled={isPending}
              className="flex-1 rounded-xl border border-slate-700 py-3 text-sm font-medium text-slate-400 hover:border-slate-500 hover:text-white transition-colors disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-2 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-500 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Importing…' : 'Import Activity'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
