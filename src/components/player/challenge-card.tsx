import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
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

function getChallengeTypeBadgeVariant(type: ChallengeType): 'default' | 'secondary' | 'gold' | 'outline' {
  switch (type) {
    case 'FOOTBALL_TRAINING_ATTENDANCE':
    case 'MATCH_COUNT':
    case 'FOOTBALL_TRAINING_ATTENDANCE':
      return 'default'
    case 'CENTER_VS_CENTER':
    case 'TEAM':
      return 'gold'
    case 'DISTANCE':
    case 'ACTIVE_MINUTES':
      return 'secondary'
    default:
      return 'outline'
  }
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
    <Card className="flex flex-col bg-slate-800 border-slate-700 text-slate-100 hover:border-slate-500 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-slate-100 text-base leading-snug line-clamp-2">
            {challenge.title}
          </CardTitle>
          <Badge
            variant={getChallengeTypeBadgeVariant(challenge.type)}
            className="shrink-0 ml-1"
          >
            {CHALLENGE_TYPE_LABELS[challenge.type]}
          </Badge>
        </div>

        {challenge.description && (
          <p className="text-sm text-slate-400 line-clamp-2 mt-1">
            {challenge.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-4 pb-4">
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className={cn(isEnded && 'text-red-400')}>{endDateLabel}</span>
          </span>

          {participantCount > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5.356-3.712M9 20H4v-2a4 4 0 015.356-3.712M15 7a4 4 0 11-8 0 4 4 0 018 0zm6 3a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {participantCount.toLocaleString()} joined
            </span>
          )}
        </div>

        {/* Points reward */}
        <div className="flex items-center gap-1.5">
          <span className="text-yellow-500">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </span>
          <span className="text-sm font-semibold text-yellow-400">{challenge.pointsReward.toLocaleString()} pts</span>
          <span className="text-xs text-slate-500">reward</span>
        </div>

        {/* Progress bar (only when joined) */}
        {isJoined && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Progress</span>
              <span className="font-medium text-slate-200">
                {userProgress.toLocaleString()} / {challenge.targetValue.toLocaleString()} {unit}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  progressPercent >= 100 ? 'bg-yellow-500' : 'bg-green-600'
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-end">
              <span className={cn(
                'text-xs font-semibold',
                progressPercent >= 100 ? 'text-yellow-400' : 'text-green-400'
              )}>
                {progressPercent >= 100 ? 'Completed!' : `${progressPercent}%`}
              </span>
            </div>
          </div>
        )}

        {/* Target info when not joined */}
        {!isJoined && (
          <div className="text-xs text-slate-500">
            Target: <span className="text-slate-300 font-medium">{challenge.targetValue.toLocaleString()} {unit}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <Link href={`/app/challenges/${challenge.id}`} className="w-full">
          <Button
            variant={isJoined ? 'outline' : 'default'}
            size="sm"
            className="w-full"
          >
            {isJoined ? 'View Progress' : 'Join Challenge'}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
