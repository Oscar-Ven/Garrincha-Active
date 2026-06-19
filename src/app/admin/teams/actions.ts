'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function toggleTeamActiveAction(
  teamId: string,
  nextActive: boolean
): Promise<{ error: string } | undefined> {
  const user = await getCurrentUser()
  if (!user) return { error: 'Not authenticated.' }
  if (user.role !== 'PLATFORM_ADMIN' && user.role !== 'CENTER_ADMIN') {
    return { error: 'Insufficient permissions.' }
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team) return { error: 'Team not found.' }

  await prisma.team.update({
    where: { id: teamId },
    data: { isActive: nextActive },
  })

  revalidatePath('/admin/teams')
}
