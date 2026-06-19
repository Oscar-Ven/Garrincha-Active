'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TeamRole } from '@/generated/prisma'

type ActionResult = { error: string } | null

// ─── Join Team ────────────────────────────────────────────────────────────────

export async function joinTeamAction(teamId: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { error: 'You must be logged in to join a team.' }

  // Verify team exists and is active
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, isActive: true },
  })
  if (!team || !team.isActive) return { error: 'Team not found.' }

  // Check not already a member
  const existing = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: user.id } },
  })
  if (existing) return { error: 'You are already a member of this team.' }

  await prisma.teamMember.create({
    data: {
      teamId,
      userId: user.id,
      role: TeamRole.MEMBER,
    },
  })

  revalidatePath('/app/teams')
  return null
}

// ─── Leave Team ───────────────────────────────────────────────────────────────

export async function leaveTeamAction(teamId: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { error: 'You must be logged in.' }

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: user.id } },
  })
  if (!membership) return { error: 'You are not a member of this team.' }
  if (membership.role === TeamRole.OWNER) {
    return { error: 'Team owners cannot leave their team. Transfer ownership or delete the team first.' }
  }

  await prisma.teamMember.delete({
    where: { teamId_userId: { teamId, userId: user.id } },
  })

  revalidatePath('/app/teams')
  return null
}

// ─── Create Team ──────────────────────────────────────────────────────────────

export async function createTeamAction(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { error: 'You must be logged in to create a team.' }

  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const description = (formData.get('description') as string | null)?.trim() || null
  const centerId = (formData.get('centerId') as string | null)?.trim() || null

  if (!name) return { error: 'Team name is required.' }
  if (name.length > 60) return { error: 'Team name must be 60 characters or fewer.' }
  if (description && description.length > 300) {
    return { error: 'Description must be 300 characters or fewer.' }
  }

  // Verify center exists if provided
  if (centerId) {
    const center = await prisma.center.findUnique({
      where: { id: centerId },
      select: { id: true, isActive: true },
    })
    if (!center || !center.isActive) return { error: 'Selected center not found.' }
  }

  // Check name uniqueness
  const existing = await prisma.team.findUnique({ where: { name } })
  if (existing) return { error: 'A team with that name already exists.' }

  const team = await prisma.team.create({
    data: {
      name,
      description,
      ...(centerId ? { centerId } : {}),
      isActive: true,
      members: {
        create: {
          userId: user.id,
          role: TeamRole.OWNER,
        },
      },
    },
  })

  revalidatePath('/app/teams')
  return null
}
