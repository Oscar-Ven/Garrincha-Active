'use client'

import { useRef, useState, useTransition } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { createChallengeAction } from './actions'

const CHALLENGE_TYPES = [
  { value: 'DISTANCE', label: 'Distance' },
  { value: 'ACTIVE_MINUTES', label: 'Active Minutes' },
  { value: 'ACTIVITY_COUNT', label: 'Activity Count' },
  { value: 'FOOTBALL_TRAINING_ATTENDANCE', label: 'Football Training Attendance' },
  { value: 'MATCH_COUNT', label: 'Match Count' },
  { value: 'POINTS', label: 'Points' },
  { value: 'CENTER_VS_CENTER', label: 'Center vs Center' },
  { value: 'TEAM', label: 'Team' },
] as const

export default function CreateChallengeDialog() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createChallengeAction(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        formRef.current?.reset()
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="md" className="shrink-0">
          <Plus className="h-4 w-4" />
          Create Challenge
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Challenge</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-slate-200">
              Title <span className="text-red-400">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              required
              placeholder="e.g. Run 50km in June"
              disabled={isPending}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-slate-200">
              Description <span className="text-red-400">*</span>
            </Label>
            <textarea
              id="description"
              name="description"
              required
              rows={3}
              placeholder="Describe the challenge goal and rules..."
              disabled={isPending}
              className="flex w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150 resize-none"
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label htmlFor="type" className="text-slate-200">
              Challenge Type <span className="text-red-400">*</span>
            </Label>
            <select
              id="type"
              name="type"
              required
              disabled={isPending}
              className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150"
            >
              <option value="" disabled>Select a type...</option>
              {CHALLENGE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate" className="text-slate-200">
                Start Date <span className="text-red-400">*</span>
              </Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                required
                disabled={isPending}
                className="[color-scheme:dark]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate" className="text-slate-200">
                End Date <span className="text-red-400">*</span>
              </Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                required
                disabled={isPending}
                className="[color-scheme:dark]"
              />
            </div>
          </div>

          {/* Target and Points */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="targetValue" className="text-slate-200">
                Target Value <span className="text-red-400">*</span>
              </Label>
              <Input
                id="targetValue"
                name="targetValue"
                type="number"
                step="0.1"
                min="0.1"
                required
                placeholder="e.g. 50"
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pointsReward" className="text-slate-200">
                Points Reward <span className="text-red-400">*</span>
              </Label>
              <Input
                id="pointsReward"
                name="pointsReward"
                type="number"
                min="1"
                required
                placeholder="e.g. 200"
                disabled={isPending}
              />
            </div>
          </div>

          {/* Image URL */}
          <div className="space-y-1.5">
            <Label htmlFor="imageUrl" className="text-slate-200">
              Image URL <span className="text-slate-500 text-xs">(optional)</span>
            </Label>
            <Input
              id="imageUrl"
              name="imageUrl"
              type="url"
              placeholder="https://..."
              disabled={isPending}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-900/30 border border-red-700/50 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Challenge
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
