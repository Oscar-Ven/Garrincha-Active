import { ActivityType } from '@/generated/prisma'

export interface SetScore {
  homeGames: number
  awayGames: number
  homeTiebreak?: number | null
  awayTiebreak?: number | null
}

export type BestOf = 3 | 5

export interface ScoreValidationResult {
  valid: boolean
  errors: string[]
  winner: 'HOME' | 'AWAY' | null
  homeSetWins: number
  awaySetWins: number
}

// Sports that use games-per-set scoring (tennis-style: first to 6 or 7 with tiebreak)
const TENNIS_STYLE_SPORTS = new Set<ActivityType>([
  ActivityType.PADEL,
  ActivityType.TENNIS,
])

// Sports that use points-per-game scoring (e.g. squash to 11, badminton to 21)
// For these we accept any positive integer per set — no max enforcement at this level
const POINTS_STYLE_SPORTS = new Set<ActivityType>([
  ActivityType.SQUASH,
  ActivityType.BADMINTON,
  ActivityType.PICKLEBALL,
  ActivityType.RACQUETBALL,
])

function isValidTennisSet(home: number, away: number): boolean {
  if (home < 0 || away < 0) return false
  if (home === away) return false
  const winner = home > away ? home : away
  const loser = home > away ? away : home
  // Normal: 6-x where x <= 4; 7-5; 7-6 (tiebreak)
  if (winner === 6 && loser <= 4) return true
  if (winner === 7 && (loser === 5 || loser === 6)) return true
  // Some formats allow 6-6 resolved by tiebreak points (represented separately)
  return false
}

export function validateMatchSets(
  sets: SetScore[],
  bestOf: BestOf,
  sport: ActivityType,
): ScoreValidationResult {
  const errors: string[] = []
  const setsToWin = bestOf === 3 ? 2 : 3
  const maxSets = bestOf

  if (sets.length === 0) {
    return { valid: false, errors: ['At least one set is required'], winner: null, homeSetWins: 0, awaySetWins: 0 }
  }

  if (sets.length > maxSets) {
    errors.push(`Too many sets for best-of-${bestOf} (max ${maxSets}, got ${sets.length})`)
  }

  let homeSetWins = 0
  let awaySetWins = 0

  for (const [i, set] of sets.entries()) {
    const n = i + 1
    const { homeGames: h, awayGames: a } = set

    if (!Number.isInteger(h) || !Number.isInteger(a)) {
      errors.push(`Set ${n}: scores must be integers`)
      continue
    }
    if (h < 0 || a < 0) {
      errors.push(`Set ${n}: scores cannot be negative`)
      continue
    }
    if (h === a) {
      errors.push(`Set ${n}: a set cannot end in a tie (${h}-${a})`)
      continue
    }

    if (TENNIS_STYLE_SPORTS.has(sport)) {
      if (!isValidTennisSet(h, a)) {
        errors.push(`Set ${n}: invalid tennis-style score ${h}-${a} (valid: 6-0..6-4, 7-5, 7-6)`)
        continue
      }
    } else if (POINTS_STYLE_SPORTS.has(sport)) {
      // Just require one side to win (positive different scores)
      // No additional constraint — flexibility for different formats
    }

    if (h > a) homeSetWins++
    else awaySetWins++

    // Stop counting once someone has won enough sets
    if (homeSetWins === setsToWin || awaySetWins === setsToWin) {
      if (i < sets.length - 1) {
        errors.push(`Match ended at set ${n} but ${sets.length - n} extra set(s) were provided`)
      }
      break
    }
  }

  const winner: 'HOME' | 'AWAY' | null =
    homeSetWins >= setsToWin ? 'HOME' :
    awaySetWins >= setsToWin ? 'AWAY' :
    null

  if (!winner && errors.length === 0) {
    errors.push(`Match is incomplete: ${homeSetWins}-${awaySetWins} sets (need ${setsToWin} to win)`)
  }

  return {
    valid: errors.length === 0,
    errors,
    winner,
    homeSetWins,
    awaySetWins,
  }
}

// Points awarded per match result (separate from activity points)
export function matchPoints(sport: ActivityType, isWinner: boolean): number {
  const base: Partial<Record<ActivityType, number>> = {
    PADEL: 60, TENNIS: 60, SQUASH: 50, PICKLEBALL: 40, BADMINTON: 40, RACQUETBALL: 50,
  }
  const pts = base[sport] ?? 40
  return isWinner ? Math.round(pts * 1.5) : Math.round(pts * 0.5)
}
