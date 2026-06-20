// Single-elimination bracket utilities

export interface BracketSlot {
  userId: string | null
  name: string | null
  avatarUrl?: string | null
}

export interface BracketMatch {
  id: string | null
  round: number
  matchIndex: number
  home: BracketSlot
  away: BracketSlot
  homeScore: number | null
  awayScore: number | null
  winnerId: string | null
  status: string
}

export interface BracketRound {
  roundNumber: number
  label: string
  matches: BracketMatch[]
}

// Build round labels based on total rounds
export function roundLabel(roundNumber: number, totalRounds: number): string {
  const fromEnd = totalRounds - roundNumber
  if (fromEnd === 0) return 'Final'
  if (fromEnd === 1) return 'Semi-finals'
  if (fromEnd === 2) return 'Quarter-finals'
  return `Round ${roundNumber}`
}

// Seed players into a bracket, padding with BYEs (null) to reach next power of 2
export function seedBracket(players: BracketSlot[]): BracketSlot[] {
  const n = players.length
  const size = Math.pow(2, Math.ceil(Math.log2(Math.max(n, 2))))
  const seeded = [...players]
  while (seeded.length < size) seeded.push({ userId: null, name: 'BYE' })
  return seeded
}

// Number of rounds for n players (after padding to power of 2)
export function totalRounds(playerCount: number): number {
  const size = Math.pow(2, Math.ceil(Math.log2(Math.max(playerCount, 2))))
  return Math.log2(size)
}
