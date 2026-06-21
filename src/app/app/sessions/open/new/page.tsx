'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ActivityType, SkillLevel } from '@/generated/prisma'
import { activityTypeLabel } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const SKILL_LEVELS = [
  { value: SkillLevel.BEGINNER, label: 'Beginner' },
  { value: SkillLevel.RECREATIONAL, label: 'Recreational' },
  { value: SkillLevel.INTERMEDIATE, label: 'Intermediate' },
  { value: SkillLevel.ADVANCED, label: 'Advanced' },
  { value: SkillLevel.EXPERT, label: 'Expert' },
]

const SPORTS = [
  ActivityType.FOOTBALL_TRAINING,
  ActivityType.FOOTBALL_MATCH,
  ActivityType.FITNESS,
  ActivityType.RUN,
  ActivityType.CYCLING,
  ActivityType.CUSTOM,
]

export default function NewOpenGamePage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    type: ActivityType.FOOTBALL_MATCH as ActivityType,
    date: '',
    startHour: '10',
    startMinute: '00',
    durationMinutes: '60',
    capacity: '10',
    minSkillLevel: '',
    maxSkillLevel: '',
    description: '',
  })

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/sessions/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to create game.'); return }
      router.push(`/app/sessions/${data.sessionId}`)
    })
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 pb-12">
      <div className="flex items-center gap-3">
        <Link
          href="/app/sessions"
          className="text-slate-400 hover:text-slate-200 transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Start an Open Game</h1>
          <p className="text-sm text-slate-400">Create a session others can join</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 px-5 py-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Game details</h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Title</label>
            <Input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Sunday morning 5v5"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Sport / Type</label>
            <select
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
              className="rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {SPORTS.map((t) => (
                <option key={t} value={t}>{activityTypeLabel(t)}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Any rules, location notes, what to bring…"
              rows={2}
              className="rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 px-5 py-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">When</h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Date</label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Start time</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={form.startHour}
                  onChange={(e) => set('startHour', e.target.value)}
                  className="w-20 text-center"
                  placeholder="HH"
                />
                <span className="text-slate-400">:</span>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={form.startMinute}
                  onChange={(e) => set('startMinute', e.target.value)}
                  className="w-20 text-center"
                  placeholder="MM"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Duration (min)</label>
              <Input
                type="number"
                min={15}
                max={480}
                value={form.durationMinutes}
                onChange={(e) => set('durationMinutes', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 px-5 py-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Players</h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Max players (0 = unlimited)</label>
            <Input
              type="number"
              min={0}
              max={100}
              value={form.capacity}
              onChange={(e) => set('capacity', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Min skill</label>
              <select
                value={form.minSkillLevel}
                onChange={(e) => set('minSkillLevel', e.target.value)}
                className="rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Any</option>
                {SKILL_LEVELS.map((sl) => <option key={sl.value} value={sl.value}>{sl.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Max skill</label>
              <select
                value={form.maxSkillLevel}
                onChange={(e) => set('maxSkillLevel', e.target.value)}
                className="rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Any</option>
                {SKILL_LEVELS.map((sl) => <option key={sl.value} value={sl.value}>{sl.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <Button type="submit" disabled={pending} size="lg" className="w-full">
          {pending ? 'Creating…' : 'Create Open Game'}
        </Button>
      </form>
    </div>
  )
}
