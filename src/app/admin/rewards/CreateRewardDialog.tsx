'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RewardCategory } from '@/generated/prisma'
import { rewardCategoryLabel } from '@/lib/utils'

interface Center {
  id: string
  name: string
}

interface Sponsor {
  id: string
  name: string
}

interface CreateRewardDialogProps {
  centers: Center[]
  sponsors: Sponsor[]
  createAction: (formData: FormData) => Promise<void>
}

export function CreateRewardDialog({
  centers,
  sponsors,
  createAction,
}: CreateRewardDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Controlled select values
  const [category, setCategory] = React.useState<RewardCategory>(RewardCategory.DISCOUNT)
  const [centerId, setCenterId] = React.useState<string>('')
  const [sponsorId, setSponsorId] = React.useState<string>('')

  const formRef = React.useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)

    try {
      const formData = new FormData(e.currentTarget)
      // Inject controlled select values since Radix Select doesn't integrate
      // natively with native FormData
      formData.set('category', category)
      formData.set('centerId', centerId === '__none__' ? '' : centerId)
      formData.set('sponsorId', sponsorId === '__none__' ? '' : sponsorId)

      await createAction(formData)
      setOpen(false)
      formRef.current?.reset()
      setCategory(RewardCategory.DISCOUNT)
      setCenterId('')
      setSponsorId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reward.')
    } finally {
      setPending(false)
    }
  }

  function handleOpenChange(next: boolean) {
    if (!pending) {
      setOpen(next)
      if (!next) {
        setError(null)
        formRef.current?.reset()
        setCategory(RewardCategory.DISCOUNT)
        setCenterId('')
        setSponsorId('')
      }
    }
  }

  const categories = Object.values(RewardCategory)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="md" className="shrink-0">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Reward
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create New Reward</DialogTitle>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="cr-title" className="block text-sm font-medium text-slate-300">
              Title <span className="text-red-400">*</span>
            </label>
            <Input
              id="cr-title"
              name="title"
              placeholder="e.g. 10% Off at SportGear"
              required
              minLength={2}
              maxLength={120}
              disabled={pending}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="cr-desc" className="block text-sm font-medium text-slate-300">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              id="cr-desc"
              name="description"
              rows={3}
              placeholder="Describe the reward in detail…"
              required
              minLength={10}
              disabled={pending}
              className="flex w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150 resize-none"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">
              Category <span className="text-red-400">*</span>
            </label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as RewardCategory)}
              disabled={pending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {rewardCategoryLabel(cat as RewardCategory)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Points Cost + Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="cr-points" className="block text-sm font-medium text-slate-300">
                Points Cost <span className="text-red-400">*</span>
              </label>
              <Input
                id="cr-points"
                name="pointsCost"
                type="number"
                min={1}
                placeholder="500"
                required
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="cr-stock" className="block text-sm font-medium text-slate-300">
                Stock
              </label>
              <Input
                id="cr-stock"
                name="stock"
                type="number"
                min={0}
                placeholder="100"
                disabled={pending}
              />
            </div>
          </div>

          {/* Center */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">
              Center <span className="text-xs font-normal text-slate-500">(optional)</span>
            </label>
            <Select
              value={centerId || '__none__'}
              onValueChange={(v) => setCenterId(v === '__none__' ? '' : v)}
              disabled={pending}
            >
              <SelectTrigger>
                <SelectValue placeholder="No center" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No center</SelectItem>
                {centers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sponsor */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">
              Sponsor <span className="text-xs font-normal text-slate-500">(optional)</span>
            </label>
            <Select
              value={sponsorId || '__none__'}
              onValueChange={(v) => setSponsorId(v === '__none__' ? '' : v)}
              disabled={pending}
            >
              <SelectTrigger>
                <SelectValue placeholder="No sponsor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No sponsor</SelectItem>
                {sponsors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expires At */}
          <div className="space-y-1.5">
            <label htmlFor="cr-expires" className="block text-sm font-medium text-slate-300">
              Expires At <span className="text-xs font-normal text-slate-500">(optional)</span>
            </label>
            <Input
              id="cr-expires"
              name="expiresAt"
              type="datetime-local"
              disabled={pending}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-md border border-red-700/50 bg-red-900/20 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="md"
              disabled={pending}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="md" disabled={pending}>
              {pending ? 'Creating…' : 'Create Reward'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
