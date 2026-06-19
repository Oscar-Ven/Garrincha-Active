'use client'

import * as React from 'react'
import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ActivityType, ActivityVisibility } from '@/generated/prisma'
import { calculateActivityPoints, POINTS_RULES } from '@/lib/points-rules'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { createActivityAction, type CreateActivityFormState } from './actions'

// ── Activity type config ──────────────────────────────────────────────────────

const ACTIVITY_TYPES: { value: ActivityType; label: string; icon: string; color: string }[] = [
  { value: ActivityType.RUN,               label: 'Run',       icon: '🏃', color: 'border-orange-600/50 bg-orange-900/20 text-orange-300' },
  { value: ActivityType.WALK,              label: 'Walk',      icon: '🚶', color: 'border-blue-600/50 bg-blue-900/20 text-blue-300' },
  { value: ActivityType.CYCLING,           label: 'Cycling',   icon: '🚴', color: 'border-yellow-600/50 bg-yellow-900/20 text-yellow-300' },
  { value: ActivityType.FOOTBALL_TRAINING, label: 'Training',  icon: '⚽', color: 'border-green-600/50 bg-green-900/20 text-green-300' },
  { value: ActivityType.FOOTBALL_MATCH,    label: 'Match',     icon: '🏟️', color: 'border-green-600/50 bg-green-900/20 text-green-300' },
  { value: ActivityType.FITNESS,           label: 'Fitness',   icon: '💪', color: 'border-purple-600/50 bg-purple-900/20 text-purple-300' },
  { value: ActivityType.CUSTOM,            label: 'Custom',    icon: '🎯', color: 'border-slate-600/50 bg-slate-800/60 text-slate-300' },
]

const DISTANCE_TYPES = new Set<ActivityType>([ActivityType.RUN, ActivityType.WALK, ActivityType.CYCLING])
const isDistanceBased = (t: ActivityType) => DISTANCE_TYPES.has(t)

function nowLocalDatetimeString() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function previewPoints(type: ActivityType, distanceRaw: string) {
  if (isDistanceBased(type)) {
    const km = parseFloat(distanceRaw)
    if (!distanceRaw || isNaN(km) || km <= 0) return { points: 0, text: `${POINTS_RULES[type]} pts/km` }
    return { points: calculateActivityPoints(type, km, undefined), text: `${km} km × ${POINTS_RULES[type]} pts/km` }
  }
  return { points: POINTS_RULES[type], text: `Flat rate for ${ACTIVITY_TYPES.find((o) => o.value === type)?.label}` }
}

const initialState: CreateActivityFormState = { success: false, fieldErrors: {}, serverError: null }

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ── Photo picker ──────────────────────────────────────────────────────────────

function PhotoPicker({ name }: { name: string }) {
  const [previews, setPreviews] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(files: FileList | null) {
    if (!files) return
    const fresh = Array.from(files).slice(0, 5 - previews.length)
    fresh.forEach((f) => {
      const url = URL.createObjectURL(f)
      setPreviews((p) => [...p, url])
    })
  }

  function removePhoto(idx: number) {
    setPreviews((p) => p.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <p className="mb-2.5 text-sm font-medium text-slate-300">Photos <span className="text-slate-500 font-normal">(up to 5)</span></p>
      <div className="flex flex-wrap gap-2">
        {previews.map((src, idx) => (
          <div key={idx} className="relative h-20 w-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full rounded-xl object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(idx)}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold shadow"
            >×</button>
          </div>
        ))}
        {previews.length < 5 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-600 text-slate-500 hover:border-slate-400 hover:text-slate-300 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-[10px]">Add</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NewActivityPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [state, formAction, isPending] = useActionState(createActivityAction, initialState)
  const [type, setType] = useState<ActivityType>(ActivityType.RUN)
  const [distanceRaw, setDistanceRaw] = useState('')
  const [showBio, setShowBio] = useState(false)
  const handledRef = useRef(false)

  const { points, text } = previewPoints(type, distanceRaw)

  useEffect(() => {
    if (state.success && !handledRef.current) {
      handledRef.current = true
      const { pointsEarned } = state
      toast({
        variant: pointsEarned > 0 ? 'success' : 'default',
        title: pointsEarned > 0 ? 'Activity logged!' : 'Activity submitted',
        description: pointsEarned > 0
          ? `You earned ${pointsEarned} points. Keep it up!`
          : 'Under review. Points awarded once approved.',
        duration: 5000,
      })
      router.push('/app/activities')
      router.refresh()
    }
  }, [state, toast, router])

  const fieldErrors = !state.success ? state.fieldErrors : {}
  const serverError = !state.success ? state.serverError : null

  const inputCls = 'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 disabled:opacity-50'

  return (
    <div className="mx-auto max-w-lg">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Log Activity</h1>
          <p className="text-xs text-slate-400">Earn points for every workout</p>
        </div>
        <a href="/app/activities/import-gpx" className="shrink-0 rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white transition-colors">
          Import GPX
        </a>
      </div>

      {/* Points preview */}
      <div className={cn(
        'mb-5 flex items-center justify-between rounded-2xl border px-5 py-4 transition-all',
        points > 0 ? 'border-yellow-700/50 bg-yellow-900/15' : 'border-slate-700/50 bg-slate-800/40',
      )}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-yellow-500/70">Est. Points</p>
          <p className={cn('mt-0.5 text-4xl font-bold tabular-nums', points > 0 ? 'text-yellow-400' : 'text-slate-600')}>
            {points}<span className="ml-1 text-lg font-normal opacity-60">pts</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{text}</p>
        </div>
        <span className="text-5xl leading-none">{ACTIVITY_TYPES.find((o) => o.value === type)?.icon ?? '🏅'}</span>
      </div>

      <form action={formAction} noValidate className="space-y-5" encType="multipart/form-data">
        {serverError && (
          <div className="rounded-xl border border-red-700/40 bg-red-900/15 px-4 py-3 text-sm text-red-300">{serverError}</div>
        )}

        {/* Activity type cards */}
        <div>
          <p className="mb-2.5 text-sm font-medium text-slate-300">Activity Type</p>
          <input type="hidden" name="type" value={type} />
          <div className="grid grid-cols-4 gap-2">
            {ACTIVITY_TYPES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setType(opt.value); setDistanceRaw('') }}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all active:scale-95',
                  type === opt.value
                    ? opt.color + ' ring-2 ring-offset-1 ring-offset-slate-950 ring-current'
                    : 'border-slate-700 bg-slate-800/40 text-slate-500 hover:border-slate-500 hover:text-slate-300',
                )}
              >
                <span className="text-2xl leading-none">{opt.icon}</span>
                <span className="text-[10px] font-semibold leading-tight">{opt.label}</span>
              </button>
            ))}
          </div>
          {fieldErrors.type && <p className="mt-1.5 text-xs text-red-400">{fieldErrors.type}</p>}
        </div>

        {/* Core fields */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4 space-y-4">
          <Field label="Title" error={fieldErrors.title}>
            <input name="title" type="text" placeholder="e.g. Morning run in the park" maxLength={100} required disabled={isPending} className={inputCls} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Date & Time" error={fieldErrors.startedAt}>
              <input name="startedAt" type="datetime-local" defaultValue={nowLocalDatetimeString()} required disabled={isPending} className={cn(inputCls, 'scheme-dark')} />
            </Field>
            <Field label="Duration (min)" error={fieldErrors.durationMinutes}>
              <input name="durationMinutes" type="number" min={1} max={1440} placeholder="e.g. 45" required disabled={isPending} className={inputCls} />
            </Field>
          </div>

          {isDistanceBased(type) ? (
            <Field label="Distance (km)" hint={`${POINTS_RULES[type]} pts per km`} error={fieldErrors.distanceKm}>
              <input
                name="distanceKm" type="number" min={0.01} step={0.01} max={1000} placeholder="e.g. 5.2"
                value={distanceRaw} onChange={(e) => setDistanceRaw(e.target.value)} disabled={isPending} className={inputCls}
              />
            </Field>
          ) : (
            <input type="hidden" name="distanceKm" value="" />
          )}

          <Field label="Notes (optional)" error={fieldErrors.description}>
            <textarea
              name="description" rows={2} maxLength={500} placeholder="How did it go?" disabled={isPending}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 disabled:opacity-50 resize-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Gear" error={fieldErrors.gear}>
              <input name="gear" type="text" placeholder="e.g. Nike Air Zoom" maxLength={100} disabled={isPending} className={inputCls} />
            </Field>
            <Field label="Effort (1–10)" error={fieldErrors.effortLevel}>
              <input name="effortLevel" type="number" min={1} max={10} placeholder="7" disabled={isPending} className={inputCls} />
            </Field>
          </div>

          <Field label="Visibility" error={fieldErrors.visibility}>
            <select name="visibility" defaultValue={ActivityVisibility.PUBLIC} disabled={isPending}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-base text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50">
              <option value={ActivityVisibility.PUBLIC}>Public</option>
              <option value={ActivityVisibility.FOLLOWERS}>Followers only</option>
              <option value={ActivityVisibility.PRIVATE}>Private</option>
            </select>
          </Field>
        </div>

        {/* Biometric data — collapsible */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowBio((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <span>❤️</span> Biometric Data <span className="text-xs font-normal text-slate-500">(optional)</span>
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" className={cn('h-4 w-4 transition-transform', showBio && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showBio && (
            <div className="border-t border-slate-700/60 px-4 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Avg HR (bpm)" error={fieldErrors.heartRateAvg}>
                  <input name="heartRateAvg" type="number" min={30} max={250} placeholder="145" disabled={isPending} className={inputCls} />
                </Field>
                <Field label="Max HR (bpm)" error={fieldErrors.heartRateMax}>
                  <input name="heartRateMax" type="number" min={30} max={250} placeholder="178" disabled={isPending} className={inputCls} />
                </Field>
                <Field label="Cadence (rpm/spm)" error={fieldErrors.cadence}>
                  <input name="cadence" type="number" min={0} max={250} placeholder="175" disabled={isPending} className={inputCls} />
                </Field>
                <Field label="Power (watts)" error={fieldErrors.powerWatts}>
                  <input name="powerWatts" type="number" min={0} max={3000} placeholder="220" disabled={isPending} className={inputCls} />
                </Field>
              </div>
              <Field label="Temperature (°C)" error={fieldErrors.temperature}>
                <input name="temperature" type="number" min={-30} max={60} step={0.5} placeholder="22" disabled={isPending} className={inputCls} />
              </Field>
            </div>
          )}
        </div>

        {/* Photo upload */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4">
          <PhotoPicker name="photos" />
        </div>

        <p className="text-xs text-slate-500 leading-relaxed px-1">
          Activities with unusually high speeds are flagged for review before points are awarded.
        </p>

        <div className="flex gap-3 pb-2">
          <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} className="flex-2">
            {isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Saving…
              </span>
            ) : 'Log Activity'}
          </Button>
        </div>
      </form>
    </div>
  )
}
