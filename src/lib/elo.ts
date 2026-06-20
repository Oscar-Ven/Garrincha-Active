// Standard Elo rating update
// k = 32 for players below 2100, lower for higher-rated
export function eloUpdate(
  ratingA: number,
  ratingB: number,
  outcome: 'win' | 'draw' | 'loss',
  k = 32,
): { newA: number; newB: number; deltaA: number } {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
  const scoreA = outcome === 'win' ? 1 : outcome === 'draw' ? 0.5 : 0
  const delta = Math.round(k * (scoreA - expectedA))
  // Floor at 800 so every active player stays within the labelled rating bands
  return {
    newA: Math.max(800, ratingA + delta),
    newB: Math.max(800, ratingB - delta),
    deltaA: delta,
  }
}

export function eloLabel(rating: number): string {
  if (rating < 800)  return 'Beginner'
  if (rating < 1000) return 'Recreational'
  if (rating < 1200) return 'Intermediate'
  if (rating < 1400) return 'Advanced'
  return 'Expert'
}
