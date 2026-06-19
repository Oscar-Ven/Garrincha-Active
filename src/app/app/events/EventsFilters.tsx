'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { EventType } from '@/generated/prisma'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  TRAINING_SESSION: 'Training Session',
  TOURNAMENT: 'Tournament',
  LEAGUE: 'League',
  CAMP: 'Camp',
  COMMUNITY_EVENT: 'Community Event',
}

interface Center {
  id: string
  name: string
  city: string | null
}

interface EventsFiltersProps {
  centers: Center[]
  activeTab: 'upcoming' | 'my-events'
  activeType: string
  activeCenter: string
}

export default function EventsFilters({
  centers,
  activeTab,
  activeType,
  activeCenter,
}: EventsFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === null || value === 'all') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      // Reset to page 1 when filters change
      const query = params.toString()
      startTransition(() => {
        router.push(`${pathname}${query ? `?${query}` : ''}`)
      })
    },
    [router, pathname, searchParams]
  )

  const setTab = (tab: string) => updateParam('tab', tab === 'upcoming' ? null : tab)
  const setType = (type: string) => updateParam('type', type)
  const setCenter = (center: string) => updateParam('center', center)

  return (
    <div className={cn('space-y-4', isPending && 'opacity-60 pointer-events-none')}>
      {/* Tab row */}
      <div className="flex items-center border-b border-slate-700">
        {(['upcoming', 'my-events'] as const).map((tab) => {
          const isActive = activeTab === tab
          const label = tab === 'upcoming' ? 'Upcoming' : 'My Events'
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setTab(tab)}
              className={cn(
                'relative px-4 py-2.5 text-sm font-medium transition-colors',
                'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-t-full after:transition-colors',
                isActive
                  ? 'text-green-400 after:bg-green-500'
                  : 'text-slate-400 hover:text-slate-200 after:bg-transparent'
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-400 shrink-0">Filter:</p>

        {/* Type filter */}
        <Select
          value={activeType || 'all'}
          onValueChange={(v) => setType(v === 'all' ? 'all' : v)}
        >
          <SelectTrigger className="w-48 h-9 text-xs">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Center filter */}
        <Select
          value={activeCenter || 'all'}
          onValueChange={(v) => setCenter(v === 'all' ? 'all' : v)}
        >
          <SelectTrigger className="w-52 h-9 text-xs">
            <SelectValue placeholder="All Centers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Centers</SelectItem>
            {centers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
                {c.city ? ` · ${c.city}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {(activeType || activeCenter) && (
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString())
              params.delete('type')
              params.delete('center')
              const query = params.toString()
              startTransition(() => {
                router.push(`${pathname}${query ? `?${query}` : ''}`)
              })
            }}
            className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-300 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
