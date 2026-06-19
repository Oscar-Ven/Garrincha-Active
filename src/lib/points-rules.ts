import { ActivityType, Level } from '@/generated/prisma'

export const POINTS_RULES: Record<ActivityType, number> = {
  RUN: 5,
  WALK: 2,
  CYCLING: 2,
  FOOTBALL_TRAINING: 50,
  FOOTBALL_MATCH: 80,
  FITNESS: 30,
  CUSTOM: 10,
}

export const MAX_DAILY_ACTIVITY_POINTS = 200

export const SUSPICIOUS_SPEED_THRESHOLDS: Record<ActivityType, number | null> = {
  RUN: 25,
  WALK: 10,
  CYCLING: 60,
  FOOTBALL_TRAINING: null,
  FOOTBALL_MATCH: null,
  FITNESS: null,
  CUSTOM: null,
}

const DISTANCE_BASED_ACTIVITIES: ActivityType[] = [
  ActivityType.RUN,
  ActivityType.WALK,
  ActivityType.CYCLING,
]

export function calculateActivityPoints(
  type: ActivityType,
  distanceKm?: number,
  durationMinutes?: number,
): number {
  if (DISTANCE_BASED_ACTIVITIES.includes(type)) {
    if (distanceKm === undefined || distanceKm === null || distanceKm <= 0 || !isFinite(distanceKm)) {
      return 0
    }
    return Math.round(distanceKm * POINTS_RULES[type])
  }

  // Session-based activities
  if (durationMinutes !== undefined && durationMinutes !== null && durationMinutes < 0) {
    return 0
  }

  return POINTS_RULES[type]
}

export function isSpeedSuspicious(type: ActivityType, speedKmH: number): boolean {
  const threshold = SUSPICIOUS_SPEED_THRESHOLDS[type]
  if (threshold === null) {
    return false
  }
  return speedKmH > threshold
}

export const LEVEL_THRESHOLDS: Record<Level, number> = {
  BRONZE: 0,
  SILVER: 500,
  GOLD: 1500,
  ELITE: 3000,
}

export function getLevelFromPoints(points: number): Level {
  if (points >= LEVEL_THRESHOLDS.ELITE) {
    return Level.ELITE
  }
  if (points >= LEVEL_THRESHOLDS.GOLD) {
    return Level.GOLD
  }
  if (points >= LEVEL_THRESHOLDS.SILVER) {
    return Level.SILVER
  }
  return Level.BRONZE
}
