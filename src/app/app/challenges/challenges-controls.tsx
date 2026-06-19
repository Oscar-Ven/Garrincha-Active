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
        'space-y-4 transition-opacity duration-200',
        isPending && 'opacity-60 pointer-events-none',
      )}
    >
      {/* ── Tabs ── */}
      <div className="flex items-center border-b border-slate-700">
        <button
          type="button"
          onClick={() => handleTabChange('available')}
          className={cn(
            'relative px-5 py-3 text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
            'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-t-full after:transition-colors',
            activeTab === 'available'
              ? 'text-green-400 font-semibold after:bg-green-500'
              : 'text-slate-400 hover:text-slate-200 after:bg-transparent',
          )}
        >
          Available
          <span
            className={cn(
              'ml-2 rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums',
              activeTab === 'available'
                ? 'bg-green-600/30 text-green-300'
                : 'bg-slate-700 text-slate-400',
            )}
          >
            {availableCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('mine')}
          className={cn(
            'relative px-5 py-3 text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
            'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-t-full after:transition-colors',
            activeTab === 'mine'
              ? 'text-green-400 font-semibold after:bg-green-500'
              : 'text-slate-400 hover:text-slate-200 after:bg-transparent',
          )}
        >
          My Challenges
          <span
            className={cn(
              'ml-2 rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums',
              activeTab === 'mine'
                ? 'bg-green-600/30 text-green-300'
                : 'bg-slate-700 text-slate-400',
            )}
          >
            {myCount}
          </span>
        </button>
      </div>

      {/* ── Type filter pills ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide mr-1">
          Filter:
        </span>
        {allTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => handleTypeChange(type)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
              activeType === type
                ? 'border-green-600 bg-green-600/20 text-green-300'
                : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-400 hover:text-slate-200',
            )}
          >
            {type === 'ALL' ? 'All Types' : CHALLENGE_TYPE_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  )
}
