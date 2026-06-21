import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ChallengeType } from '@/generated/prisma'

interface ChallengeCardProps {
  challenge: {
    id: string
    title: string
    description: string | null
    type: ChallengeType
    endDate: Date | string
    targetValue: number
    pointsReward: number
    _count?: {
      participants: number
    }
  }
  userProgress?: number
  isJoined?: boolean
}

const CHALLENGE_TYPE_LABELS: Record<ChallengeType, string> = {
  DISTANCE: 'Distance',
  ACTIVE_MINUTES: 'Active Minutes',
  ACTIVITY_COUNT: 'Activity Count',
  FOOTBALL_TRAINING_ATTENDANCE: 'Training Attendance',
  MATCH_COUNT: 'Matches',
  POINTS: 'Points',
  CENTER_VS_CENTER: 'Center vs Center',
  TEAM: 'Team',
  STREAK: 'Streak',
  SEGMENT_EFFORTS: 'Segment Efforts',
}

const CHALLENGE_TYPE_UNITS: Record<ChallengeType, string> = {
  DISTANCE: 'km',
  ACTIVE_MINUTES: 'min',
  ACTIVITY_COUNT: 'activities',
  FOOTBALL_TRAINING_ATTENDANCE: 'sessions',
  MATCH_COUNT: 'matches',
  POINTS: 'pts',
  CENTER_VS_CENTER: 'pts',
  TEAM: 'pts',
  STREAK: 'days',
  SEGMENT_EFFORTS: 'segments',
}

function challengeTypeBadgeClass(type: ChallengeType): string {
  switch (type) {
    case 'FOOTBALL_TRAINING_ATTENDANCE':
    case 'MATCH_COUNT':
      return 'bg-primary-fixed/10 text-primary-fixed border-primary-fixed/20'
    case 'CENTER_VS_CENTER':
    case 'TEAM':
      return 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20'
    case 'DISTANCE':
    case 'ACTIVE_MINUTES':
      return 'bg-secondary/10 text-secondary border-secondary/20'
    default:
      return 'bg-white/5 text-on-surface-variant border-white/10'
  }
}

function formatEndDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'Ended'
  if (diffDays === 0) return 'Ends today'
  if (diffDays === 1) return '1 day left'
  if (diffDays <= 7) return `${diffDays} days left`

  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ChallengeCard({ challenge, userProgress = 0, isJoined = false }: ChallengeCardProps) {
  const progressPercent = challenge.targetValue > 0
    ? Math.min(100, Math.round((userProgress / challenge.targetValue) * 100))
    : 0
  const unit = CHALLENGE_TYPE_UNITS[challenge.type]
  const endDateLabel = formatEndDate(challenge.endDate)
  const isEnded = endDateLabel === 'Ended'
  const participantCount = challenge._count?.participants ?? 0

  return (
    <div className="glass-card rounded-xl flex flex-col hover:bg-surface-container-high transition-colors">
      {/* Header */}
      <div className="p-md pb-sm">
        <div className="flex items-start justify-between gap-2 mb-xs">
          <h3 className="text-body-md font-bold text-on-surface leading-snug line-clamp-2 flex-1">
            {challenge.title}
          </h3>
          <span className={cn(
            'shrink-0 ml-1 rounded-full border px-2 py-0.5 text-label-caps',
            challengeTypeBadgeClass(challenge.type)
          )}>
            {CHALLENGE_TYPE_LABELS[challenge.type]}
          </span>
        </div>
        {challenge.description && (
          <p className="text-label-caps text-on-surface-variant line-clamp-2">
            {challenge.description}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-md space-y-sm pb-sm">
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-md gap-y-1 text-label-caps text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}
            >
              event
            </span>
            <span className={cn(isEnded && 'text-error')}>{endDateLabel}</span>
          </span>
          {participantCount > 0 && (
            <span className="flex items-center gap-1">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}
              >
                group
              </span>
              {participantCount.toLocaleString()} joined
            </span>
          )}
        </div>

        {/* Points reward */}
        <div className="flex items-center gap-1.5">
          <span
            className="material-symbols-outlined text-[#FFD700]"
            style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
          >
            stars
          </span>
          <span className="text-label-caps font-bold text-[#FFD700]">
            {challenge.pointsReward.toLocaleString()} pts
          </span>
          <span className="text-label-caps text-on-surface-variant">reward</span>
        </div>

        {/* Progress bar (only when joined) */}
        {isJoined && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-label-caps">
              <span className="text-on-surface-variant">Progress</span>
              <span className="font-bold text-on-surface">
                {userProgress.toLocaleString()} / {challenge.targetValue.toLocaleString()} {unit}
              </span>
            </div>
            <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  progressPercent >= 100 ? 'bg-[#FFD700]' : 'bg-primary-fixed'
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-end">
              <span className={cn(
                'text-label-caps font-bold',
                progressPercent >= 100 ? 'text-[#FFD700]' : 'text-primary-fixed'
              )}>
                {progressPercent >= 100 ? 'Completed!' : `${progressPercent}%`}
              </span>
            </div>
          </div>
        )}

        {/* Target info when not joined */}
        {!isJoined && (
          <p className="text-label-caps text-on-surface-variant">
            Target:{' '}
            <span className="text-on-surface font-bold">
              {challenge.targetValue.toLocaleString()} {unit}
            </span>
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-md pb-md pt-xs">
        <Link
          href={`/app/challenges/${challenge.id}`}
          className={cn(
            'block w-full rounded-xl py-sm text-center text-label-caps font-bold transition-all active:scale-95',
            isJoined
              ? 'glass-card text-on-surface hover:bg-surface-container-high'
              : 'bg-primary-fixed text-on-primary-fixed hover:bg-primary-fixed-dim action-glow'
          )}
        >
          {isJoined ? 'View Progress' : 'Join Challenge'}
        </Link>
      </div>
    </div>
  )
}
