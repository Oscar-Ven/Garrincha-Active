'use client'

import * as React from 'react'
import Link from 'next/link'
import { useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CenterRow {
  id: string
  name: string
  city: string | null
  address: string | null
  phone: string | null
  email: string | null
  description: string | null
  isActive: boolean
  playerCount: number
  createdAt: string
}

interface Props {
  centers: CenterRow[]
  createCenter: (fd: FormData) => Promise<{ error?: string }>
  updateCenter: (fd: FormData) => Promise<{ error?: string }>
  toggleCenterActive: (id: string, isActive: boolean) => Promise<{ error?: string }>
}

// ─── Field component ──────────────────────────────────────────────────────────

function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  required,
  placeholder,
  isTextarea,
}: {
  label: string
  name: string
  defaultValue?: string
  type?: string
  required?: boolean
  placeholder?: string
  isTextarea?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </Label>
      {isTextarea ? (
        <textarea
          id={name}
          name={name}
          defaultValue={defaultValue ?? ''}
          placeholder={placeholder}
          rows={3}
          className={cn(
            'w-full resize-none rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600',
            'disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150',
          )}
        />
      ) : (
        <Input
          id={name}
          name={name}
          type={type}
          defaultValue={defaultValue ?? ''}
          placeholder={placeholder}
          required={required}
        />
      )}
    </div>
  )
}

// ─── Create dialog ────────────────────────────────────────────────────────────

function CreateCenterDialog({
  open,
  onClose,
  createCenter,
}: {
  open: boolean
  onClose: () => void
  createCenter: (fd: FormData) => Promise<{ error?: string }>
}) {
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const formRef = React.useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createCenter(fd)
      if (result.error) {
        setError(result.error)
      } else {
        formRef.current?.reset()
        onClose()
      }
    })
  }

  // Reset error when dialog closes
  React.useEffect(() => {
    if (!open) setError(null)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Center</DialogTitle>
          <DialogDescription>
            Add a new sports center to the platform.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Center Name" name="name" required placeholder="e.g. Garrincha Academy Beirut" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" name="city" placeholder="e.g. Beirut" />
            <Field label="Phone" name="phone" type="tel" placeholder="+961 1 234 567" />
          </div>
          <Field label="Address" name="address" placeholder="Street, area" />
          <Field label="Email" name="email" type="email" placeholder="center@example.com" />
          <Field label="Description" name="description" isTextarea placeholder="Short description of the center..." />

          {error && (
            <p role="alert" className="rounded-lg border border-red-700/40 bg-red-900/20 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="md">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" variant="default" size="md" disabled={pending}>
              {pending ? 'Creating…' : 'Create Center'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit dialog ──────────────────────────────────────────────────────────────

function EditCenterDialog({
  center,
  onClose,
  updateCenter,
}: {
  center: CenterRow | null
  onClose: () => void
  updateCenter: (fd: FormData) => Promise<{ error?: string }>
}) {
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateCenter(fd)
      if (result.error) {
        setError(result.error)
      } else {
        onClose()
      }
    })
  }

  React.useEffect(() => {
    if (!center) setError(null)
  }, [center])

  return (
    <Dialog open={center !== null} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Center</DialogTitle>
          <DialogDescription>Update center details.</DialogDescription>
        </DialogHeader>

        {center && (
          <form key={center.id} onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={center.id} />
            <Field label="Center Name" name="name" required defaultValue={center.name} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" name="city" defaultValue={center.city ?? ''} />
              <Field label="Phone" name="phone" type="tel" defaultValue={center.phone ?? ''} />
            </div>
            <Field label="Address" name="address" defaultValue={center.address ?? ''} />
            <Field label="Email" name="email" type="email" defaultValue={center.email ?? ''} />
            <Field label="Description" name="description" isTextarea defaultValue={center.description ?? ''} />

            {error && (
              <p role="alert" className="rounded-lg border border-red-700/40 bg-red-900/20 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="md">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" variant="default" size="md" disabled={pending}>
                {pending ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Toggle button ────────────────────────────────────────────────────────────

function ToggleActiveButton({
  id,
  isActive,
  toggleCenterActive,
}: {
  id: string
  isActive: boolean
  toggleCenterActive: (id: string, isActive: boolean) => Promise<{ error?: string }>
}) {
  const [optimistic, setOptimistic] = React.useState(isActive)
  const [pending, startTransition] = useTransition()

  function handleClick() {
    const next = !optimistic
    setOptimistic(next)
    startTransition(async () => {
      const result = await toggleCenterActive(id, next)
      if (result.error) {
        // Revert on error
        setOptimistic(!next)
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      aria-label={optimistic ? 'Deactivate center' : 'Activate center'}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
        'disabled:cursor-not-allowed disabled:opacity-50',
        optimistic ? 'bg-green-600' : 'bg-slate-600',
      )}
      role="switch"
      aria-checked={optimistic}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0',
          'transition-transform duration-200 ease-in-out',
          optimistic ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  )
}

// ─── Main client component ────────────────────────────────────────────────────

export function CentersClient({ centers, createCenter, updateCenter, toggleCenterActive }: Props) {
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<CenterRow | null>(null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Centers</h1>
          <p className="mt-1 text-sm text-slate-400">
            {centers.length} center{centers.length !== 1 ? 's' : ''} registered on the platform.
          </p>
        </div>

        <Button
          variant="default"
          size="md"
          onClick={() => setCreateOpen(true)}
          className="shrink-0"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create Center
        </Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Total Centers',
            value: centers.length,
            color: 'text-green-400',
            bg: 'bg-green-600/10',
          },
          {
            label: 'Active',
            value: centers.filter((c) => c.isActive).length,
            color: 'text-emerald-400',
            bg: 'bg-emerald-600/10',
          },
          {
            label: 'Inactive',
            value: centers.filter((c) => !c.isActive).length,
            color: 'text-slate-400',
            bg: 'bg-slate-700/40',
          },
          {
            label: 'Total Players',
            value: centers.reduce((sum, c) => sum + c.playerCount, 0),
            color: 'text-blue-400',
            bg: 'bg-blue-600/10',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3"
          >
            <span className="text-xs text-slate-400">{stat.label}</span>
            <span className={cn('text-2xl font-bold tabular-nums', stat.color)}>
              {stat.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        {centers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800">
              <svg
                className="h-7 w-7 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">No centers yet</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Create your first center to get started.
              </p>
            </div>
            <Button variant="default" size="sm" onClick={() => setCreateOpen(true)}>
              Create Center
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/60">
                  <th className="px-4 py-3 text-left font-medium text-slate-400">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-400">City</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-400">Contact</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-400">Players</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-400">Active</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {centers.map((center) => (
                  <tr
                    key={center.id}
                    className="group transition-colors hover:bg-slate-800/40"
                  >
                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-600/10 text-green-400">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.8}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
                            />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">{center.name}</p>
                          {center.address && (
                            <p className="text-xs text-slate-500 truncate max-w-55">{center.address}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* City */}
                    <td className="px-4 py-3 text-slate-300">
                      {center.city ?? <span className="text-slate-600">—</span>}
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {center.email ? (
                          <span className="text-slate-300 text-xs">{center.email}</span>
                        ) : null}
                        {center.phone ? (
                          <span className="text-slate-400 text-xs">{center.phone}</span>
                        ) : null}
                        {!center.email && !center.phone && (
                          <span className="text-slate-600">—</span>
                        )}
                      </div>
                    </td>

                    {/* Players */}
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          'inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums',
                          center.playerCount > 0
                            ? 'bg-blue-600/15 text-blue-400'
                            : 'bg-slate-700/40 text-slate-500',
                        )}
                      >
                        {center.playerCount.toLocaleString()}
                      </span>
                    </td>

                    {/* Active toggle */}
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <ToggleActiveButton
                          id={center.id}
                          isActive={center.isActive}
                          toggleCenterActive={toggleCenterActive}
                        />
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/centers/${center.id}`}
                          className={cn(
                            'rounded-lg border border-green-700/40 bg-green-600/10 px-3 py-1.5 text-xs font-medium text-green-400',
                            'transition-colors hover:bg-green-600/20 hover:text-green-300',
                          )}
                        >
                          QR / Manage
                        </Link>
                        <button
                          onClick={() => setEditTarget(center)}
                          className={cn(
                            'rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300',
                            'transition-colors hover:border-slate-600 hover:text-white',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
                          )}
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateCenterDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        createCenter={createCenter}
      />
      <EditCenterDialog
        center={editTarget}
        onClose={() => setEditTarget(null)}
        updateCenter={updateCenter}
      />
    </div>
  )
}
