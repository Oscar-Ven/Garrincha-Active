'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ActivityType } from '@/generated/prisma'
import { activityTypeIcon, activityTypeLabel } from '@/lib/utils'

const ACTIVITY_TYPES = Object.values(ActivityType)

export default function NewSessionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/admin/sessions', {
      method: 'POST',
      body: JSON.stringify({
        centerId: fd.get('centerId'),
        title: fd.get('title'),
        description: fd.get('description') || undefined,
        type: fd.get('type'),
        startTime: fd.get('startTime'),
        endTime: fd.get('endTime'),
        capacity: fd.get('capacity') ? Number(fd.get('capacity')) : -1,
        pointsReward: fd.get('pointsReward') ? Number(fd.get('pointsReward')) : 0,
        isPublic: fd.get('isPublic') === 'on',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    setLoading(false)
    if (res.ok) {
      router.push('/admin/sessions')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
    }
  }

  const inputCls = 'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-600'

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/sessions" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </Link>
        <h1 className="text-xl font-bold text-white">New Session</h1>
      </div>

      {error && (
        <div className="rounded-xl border border-red-600/40 bg-red-600/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Title <span className="text-red-400">*</span></label>
            <input name="title" type="text" required maxLength={100} placeholder="e.g. Tuesday Evening Training" className={inputCls} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Center ID <span className="text-red-400">*</span></label>
            <input name="centerId" type="text" required placeholder="Center ID (from admin center list)" className={inputCls} />
            <p className="text-xs text-slate-500">Find center IDs in the Centers admin page.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Activity type <span className="text-red-400">*</span></label>
            <select name="type" required defaultValue="FOOTBALL_TRAINING" className={inputCls}>
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>{activityTypeIcon(t)} {activityTypeLabel(t)}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Start <span className="text-red-400">*</span></label>
              <input name="startTime" type="datetime-local" required className={`${inputCls} [color-scheme:dark]`} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">End <span className="text-red-400">*</span></label>
              <input name="endTime" type="datetime-local" required className={`${inputCls} [color-scheme:dark]`} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Max capacity</label>
              <input name="capacity" type="number" min={1} placeholder="Unlimited" className={inputCls} />
              <p className="text-xs text-slate-500">Leave blank for unlimited</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Points reward</label>
              <input name="pointsReward" type="number" min={0} defaultValue={0} className={inputCls} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Description</label>
            <textarea name="description" rows={3} maxLength={500} placeholder="Optional details…"
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-600" />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input name="isPublic" type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-600 bg-slate-700 accent-green-500" />
            <div>
              <p className="text-sm font-medium text-slate-300">Publicly visible</p>
              <p className="text-xs text-slate-500">Unchecked sessions are only visible to admins</p>
            </div>
          </label>
        </div>

        <div className="flex gap-3 pb-2">
          <Link href="/admin/sessions"
            className="flex-1 rounded-xl border border-slate-700 py-3 text-sm font-medium text-slate-400 hover:text-white hover:border-slate-500 transition-colors text-center">
            Cancel
          </Link>
          <button type="submit" disabled={loading}
            className="flex-2 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-500 transition-colors disabled:opacity-60">
            {loading ? 'Creating…' : 'Create Session'}
          </button>
        </div>
      </form>
    </div>
  )
}
