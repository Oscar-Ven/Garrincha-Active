'use server'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ActivityVisibility } from '@/generated/prisma'

export interface SettingsData {
  id: string
  name: string
  nickname: string
  email: string
  phone: string | null
  dateOfBirth: string | null
  bio: string | null
  favoriteSport: string | null
  defaultVisibility: ActivityVisibility
  avatarUrl: string | null
}

export async function loadSettingsData(): Promise<SettingsData | null> {
  const session = await getCurrentUser()
  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      nickname: true,
      email: true,
      phone: true,
      dateOfBirth: true,
      avatarUrl: true,
      playerProfile: {
        select: {
          bio: true,
          favoriteSport: true,
        },
      },
    },
  })

  if (!user) return null

  return {
    id: user.id,
    name: user.name,
    nickname: user.nickname,
    email: user.email,
    phone: user.phone ?? null,
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString() : null,
    bio: user.playerProfile?.bio ?? null,
    favoriteSport: user.playerProfile?.favoriteSport ?? null,
    avatarUrl: user.avatarUrl ?? null,
    // Default — client merges in localStorage pref if set
    defaultVisibility: ActivityVisibility.PUBLIC,
  }
}

export async function saveProfileInfo(
  userId: string,
  data: {
    name: string
    nickname: string
    bio?: string
    favoriteSport?: string
    phone?: string
    dateOfBirth?: string
  },
): Promise<{ error?: string }> {
  const session = await getCurrentUser()
  if (!session || session.id !== userId) {
    return { error: 'Unauthorized.' }
  }

  // Check nickname uniqueness (exclude self)
  if (data.nickname) {
    const existing = await prisma.user.findFirst({
      where: { nickname: data.nickname, NOT: { id: userId } },
      select: { id: true },
    })
    if (existing) {
      return { error: 'That nickname is already taken. Please choose another.' }
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      nickname: data.nickname,
      phone: data.phone ?? null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
    },
  })

  await prisma.playerProfile.upsert({
    where: { userId },
    create: {
      userId,
      bio: data.bio ?? null,
      favoriteSport: data.favoriteSport ?? null,
    },
    update: {
      bio: data.bio ?? null,
      favoriteSport: data.favoriteSport ?? null,
    },
  })

  return {}
}

export async function savePrivacySettings(
  userId: string,
): Promise<{ error?: string }> {
  const session = await getCurrentUser()
  if (!session || session.id !== userId) {
    return { error: 'Unauthorized.' }
  }

  // Ensure PlayerProfile row exists; defaultVisibility is stored client-side
  // in localStorage since the schema has no dedicated column for it.
  await prisma.playerProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  })

  return {}
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ error?: string }> {
  const session = await getCurrentUser()
  if (!session || session.id !== userId) {
    return { error: 'Unauthorized.' }
  }

  const bcrypt = await import('bcryptjs')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  })

  if (!user) {
    return { error: 'User not found. Please log in again.' }
  }

  const valid = await bcrypt.default.compare(currentPassword, user.passwordHash)
  if (!valid) {
    return { error: 'Current password is incorrect.' }
  }

  if (currentPassword === newPassword) {
    return { error: 'New password must be different from your current password.' }
  }

  const hash = await bcrypt.default.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hash },
  })

  return {}
}
