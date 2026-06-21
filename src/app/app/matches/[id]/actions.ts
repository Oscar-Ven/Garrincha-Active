'use server'

import { getCurrentUser } from '@/lib/auth'
import { confirmMatch, disputeMatch } from '@/services/matches'
import { ApiError } from '@/lib/api-error'
import { revalidatePath } from 'next/cache'

export type MatchActionState = { error?: string; success?: boolean }

export async function confirmMatchAction(matchId: string): Promise<MatchActionState> {
  const user = await getCurrentUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    await confirmMatch(matchId, user.id)
    revalidatePath(`/app/matches/${matchId}`)
    return { success: true }
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    console.error(err)
    return { error: 'Something went wrong' }
  }
}

export async function disputeMatchAction(matchId: string, note?: string): Promise<MatchActionState> {
  const user = await getCurrentUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    await disputeMatch(matchId, user.id, note)
    revalidatePath(`/app/matches/${matchId}`)
    return { success: true }
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message }
    console.error(err)
    return { error: 'Something went wrong' }
  }
}
