import clsx, { ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format as dateFnsFormat } from 'date-fns'
import { Level, ActivityType, RewardCategory } from '@/generated/prisma'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string, fmt = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return dateFnsFormat(d, fmt)
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return dateFnsFormat(d, 'MMM d, yyyy h:mm a')
}

export function formatDistance(km: number): string {
  return `${km.toFixed(1)} km`
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function formatPace(minPerKm: number): string {
  const mins = Math.floor(minPerKm)
  const secs = Math.round((minPerKm - mins) * 60)
  const secsStr = secs.toString().padStart(2, '0')
  return `${mins}'${secsStr}"/km`
}

export function getLevelColor(level: Level): string {
  switch (level) {
    case Level.BRONZE:
      return 'text-amber-700'
    case Level.SILVER:
      return 'text-slate-400'
    case Level.GOLD:
      return 'text-yellow-500'
    case Level.ELITE:
      return 'text-emerald-400'
    default:
      return 'text-slate-400'
  }
}

export function getLevelThreshold(level: Level): number {
  switch (level) {
    case Level.BRONZE:
      return 0
    case Level.SILVER:
      return 500
    case Level.GOLD:
      return 2000
    case Level.ELITE:
      return 5000
    default:
      return 0
  }
}

export function getNextLevel(currentPoints: number): { level: Level; remaining: number } {
  if (currentPoints < 500) {
    return { level: Level.SILVER, remaining: 500 - currentPoints }
  }
  if (currentPoints < 2000) {
    return { level: Level.GOLD, remaining: 2000 - currentPoints }
  }
  if (currentPoints < 5000) {
    return { level: Level.ELITE, remaining: 5000 - currentPoints }
  }
  return { level: Level.ELITE, remaining: 0 }
}

export function activityTypeLabel(type: ActivityType): string {
  switch (type) {
    case ActivityType.PADEL:
      return 'Padel'
    case ActivityType.TENNIS:
      return 'Tennis'
    case ActivityType.SQUASH:
      return 'Squash'
    case ActivityType.PICKLEBALL:
      return 'Pickleball'
    case ActivityType.BADMINTON:
      return 'Badminton'
    case ActivityType.RACQUETBALL:
      return 'Racquetball'
    case ActivityType.RUN:
      return 'Run'
    case ActivityType.WALK:
      return 'Walk'
    case ActivityType.CYCLING:
      return 'Cycling'
    case ActivityType.FOOTBALL_TRAINING:
      return 'Football Training'
    case ActivityType.FOOTBALL_MATCH:
      return 'Football Match'
    case ActivityType.FITNESS:
      return 'Fitness'
    case ActivityType.CUSTOM:
      return 'Custom Activity'
    default:
      return 'Activity'
  }
}

export function activityTypeIcon(type: ActivityType): string {
  switch (type) {
    case ActivityType.PADEL:
      return '🎾'
    case ActivityType.TENNIS:
      return '🎾'
    case ActivityType.SQUASH:
      return '🏸'
    case ActivityType.PICKLEBALL:
      return '🏓'
    case ActivityType.BADMINTON:
      return '🏸'
    case ActivityType.RACQUETBALL:
      return '🎾'
    case ActivityType.RUN:
      return '🏃'
    case ActivityType.WALK:
      return '🚶'
    case ActivityType.CYCLING:
      return '🚴'
    case ActivityType.FOOTBALL_TRAINING:
      return '⚽'
    case ActivityType.FOOTBALL_MATCH:
      return '🏟️'
    case ActivityType.FITNESS:
      return '💪'
    case ActivityType.CUSTOM:
      return '🎯'
    default:
      return '🏅'
  }
}

export function rewardCategoryLabel(cat: RewardCategory): string {
  switch (cat) {
    case RewardCategory.DISCOUNT:
      return 'Discount'
    case RewardCategory.MERCHANDISE:
      return 'Merchandise'
    case RewardCategory.FREE_SESSION:
      return 'Free Session'
    case RewardCategory.FOOD_DRINK:
      return 'Food & Drink'
    case RewardCategory.TOURNAMENT_ENTRY:
      return 'Tournament Entry'
    case RewardCategory.SPONSOR_VOUCHER:
      return 'Sponsor Voucher'
    case RewardCategory.VIP_ACCESS:
      return 'VIP Access'
    default:
      return 'Reward'
  }
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 3) + '...'
}
