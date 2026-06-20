import { ActivityType } from '@/generated/prisma'

// MET values per activity type
const MET: Record<ActivityType, number> = {
  RUN: 9.8,
  WALK: 3.5,
  CYCLING: 7.5,
  FOOTBALL_TRAINING: 7.0,
  FOOTBALL_MATCH: 10.0,
  FITNESS: 6.0,
  CUSTOM: 5.0,
  PADEL: 7.0,
  TENNIS: 7.3,
  SQUASH: 12.0,
  PICKLEBALL: 4.5,
  BADMINTON: 5.5,
  RACQUETBALL: 10.0,
}

// Estimate calories: MET × weight(kg) × hours
export function estimateCalories(
  type: ActivityType,
  durationMinutes: number,
  weightKg = 70,
): number {
  const met = MET[type] ?? 5.0
  return Math.round(met * weightKg * (durationMinutes / 60))
}
