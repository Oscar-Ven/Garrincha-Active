import { ActivityType } from '@/generated/prisma'
import { eloUpdate } from '@/lib/elo'

export interface SportRatingSnapshot {
  rating: number
  wins: number
  losses: number
}

export interface EloUpdateResult {
  homeNewRating: number
  awayNewRating: number
  homeDelta: number
  awayDelta: number
}

// Per-sport ELO uses a more conservative K-factor than the global ELO
// to keep sport-specific ratings stable while global ELO evolves faster.
function kFactor(totalGames: number): number {
  if (totalGames < 10) return 32
  if (totalGames < 30) return 24
  return 16
}

export function computeSportElo(
  home: SportRatingSnapshot,
  away: SportRatingSnapshot,
  winner: 'HOME' | 'AWAY',
): EloUpdateResult {
  const homeGames = home.wins + home.losses
  const awayGames = away.wins + away.losses
  const kHome = kFactor(homeGames)
  const kAway = kFactor(awayGames)

  const outcome = winner === 'HOME' ? 'win' : 'loss'
  const { newA: homeNew, newB: awayNew } = eloUpdate(home.rating, away.rating, outcome, Math.min(kHome, kAway))

  return {
    homeNewRating: homeNew,
    awayNewRating: awayNew,
    homeDelta: homeNew - home.rating,
    awayDelta: awayNew - away.rating,
  }
}

// For doubles: average team ratings to get an effective singles rating
export function teamRating(ratingA: number, ratingB: number): number {
  return Math.round((ratingA + ratingB) / 2)
}

// Map sport to a label string for display
export function sportEloLabel(rating: number): string {
  if (rating < 900)  return 'Beginner'
  if (rating < 1050) return 'Recreational'
  if (rating < 1200) return 'Intermediate'
  if (rating < 1350) return 'Advanced'
  if (rating < 1500) return 'Expert'
  return 'Elite'
}

// Which sports use per-sport ratings
export const RATED_SPORTS = new Set<ActivityType>([
  ActivityType.PADEL,
  ActivityType.TENNIS,
  ActivityType.SQUASH,
  ActivityType.PICKLEBALL,
  ActivityType.BADMINTON,
  ActivityType.RACQUETBALL,
])
