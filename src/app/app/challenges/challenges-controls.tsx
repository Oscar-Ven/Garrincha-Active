'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { ChallengeType } from '@/generated/prisma'

const CHALLENGE_TYPE_LABELS: Record<ChallengeType, string> = {
  DISTANCE: 'Distance',
  ACTIVE_MINUTES: 'Active Minutes',
  ACTIVITY_COUNT: 'Activity Count',
  FOOTBALL_TRAINING_ATTENDANCE: 'Training Attendance',
  MATCH_COUNT: 'Match Count',
  POINTS: 'Points',
  CENTER_VS_CENTER: 'Center vs Center',
  TEAM: 'Team',
  STREAK: 'Streak',
  SEGMENT_EFFORTS: 'Segment Efforts',
}

interface ChallengesControlsProps {
  activeTab: 'available' | 'mine'
  activeType: ChallengeType | 'ALL'
  availableCount: number
  myCount: number
}

export function ChallengesControls({
  activeTab,
  activeType,
  availableCount,
  myCount,
}: ChallengesControlsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const navigate = useCallback(
    (params: Record<string, string>) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(params)) {
        if (value === '' || value === 'ALL') {
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

  const handleTabChange = (tab: 'available' | 'mine') => {
    navigate({ tab, type: 'ALL' })
  }

  const handleTypeChange = (type: ChallengeType | 'ALL') => {
    navigate({ type: type === 'ALL' ? 'ALL' : type })
  }

  const allTypes: Array<ChallengeType | 'ALL'> = [
    'ALL',
    ...Object.values(ChallengeType),
  ]

  return (
    <div
      className={cn(
        'space-y-md transition-opacity duration-200',
        isPending && 'opacity-60 pointer-events-none',
      )}
    >
      {/* ── Tabs ── */}
      <div className="flex items-center border-b border-white/10">
        {(['available', 'mine'] as const).map((tab) => {
          const isActive = activeTab === tab
          const count = tab === 'available' ? availableCount : myCount
          const label = tab === 'available' ? 'Available' : 'My Challenges'
          return (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabChange(tab)}
              className={cn(
                'relative px-md py-sm text-label-caps font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest',
                'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-t-full after:transition-colors',
                isActive
                  ? 'text-primary-fixed font-bold after:bg-primary-fixed'
                  : 'text-on-surface-variant hover:text-on-surface after:bg-transparent',
              )}
            >
              {label}
              <span
                className={cn(
                  'ml-2 rounded-full px-1.5 py-0.5 text-label-caps font-bold tabular-nums',
                  isActive
                    ? 'bg-primary-fixed/10 text-primary-fixed'
                    : 'bg-surface-container-highest text-on-surface-variant',
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Type filter pills ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-label-caps text-on-surface-variant mr-1">Filter:</span>
        {allTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => handleTypeChange(type)}
            className={cn(
              'rounded-full border px-md py-0.5 text-label-caps font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest',
              activeType === type
                ? 'border-primary-fixed bg-primary-fixed/10 text-primary-fixed'
                : 'glass-card text-on-surface-variant hover:text-on-surface',
            )}
          >
            {type === 'ALL' ? 'All Types' : CHALLENGE_TYPE_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  )
}
