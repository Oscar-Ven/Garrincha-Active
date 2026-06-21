'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { cn } from '@/lib/utils'
import type { LeaderboardFilter, LeaderboardMetric } from '@/services/leaderboard'

const TAB_LABELS: Record<LeaderboardFilter, string> = {
  global: 'Global',
  center: 'By Center',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

const METRIC_LABELS: Record<LeaderboardMetric, string> = {
  points: 'Points',
  distance: 'Distance',
  minutes: 'Minutes',
}

interface LeaderboardControlsProps {
  activeTab: LeaderboardFilter
  activeMetric: LeaderboardMetric
  hasCenter: boolean
}

export function LeaderboardControls({
  activeTab,
  activeMetric,
  hasCenter,
}: LeaderboardControlsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const navigate = useCallback(
    (params: Record<string, string>) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(params)) {
        if (!value) {
          next.delete(key)
        } else {
          next.set(key, value)
        }
      }
      startTransition(() => {
        router.push(`${pathname}?${next.toString()}`)
      })
    },
    [router, pathname, searchParams],
  )

  const allTabs: LeaderboardFilter[] = ['global', 'center', 'weekly', 'monthly']
  const allMetrics: LeaderboardMetric[] = ['points', 'distance', 'minutes']

  return (
    <div
      className={cn(
        'space-y-4 transition-opacity duration-200',
        isPending && 'opacity-60 pointer-events-none',
      )}
    >
      {/* ── Tab strip ── */}
      <div className="flex items-center border-b border-white/10">
        {allTabs.map((tab) => {
          const disabled = tab === 'center' && !hasCenter
          return (
            <button
              key={tab}
              type="button"
              disabled={disabled}
              onClick={() => navigate({ tab, metric: activeMetric })}
              title={disabled ? 'You are not assigned to a center' : undefined}
              className={cn(
                'relative px-4 py-3 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest',
                'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-t-full after:transition-colors',
                activeTab === tab
                  ? 'text-primary-fixed font-semibold after:bg-primary-fixed'
                  : 'text-on-surface-variant hover:text-on-surface after:bg-transparent',
                disabled && 'cursor-not-allowed opacity-40',
              )}
            >
              {TAB_LABELS[tab]}
            </button>
          )
        })}
      </div>

      {/* ── Metric pills ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
          Metric:
        </span>
        {allMetrics.map((metric) => (
          <button
            key={metric}
            type="button"
            onClick={() => navigate({ tab: activeTab, metric })}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest',
              activeMetric === metric
                ? 'border-primary-fixed bg-primary-fixed/10 text-primary-fixed'
                : 'glass-card text-on-surface-variant hover:text-on-surface',
            )}
          >
            {METRIC_LABELS[metric]}
          </button>
        ))}
      </div>
    </div>
  )
}
