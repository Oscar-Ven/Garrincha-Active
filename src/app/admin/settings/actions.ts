'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// ─── Platform Name ────────────────────────────────────────────────────────────

export async function updatePlatformName(
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const session = await getCurrentUser()
  if (!session || session.role !== 'PLATFORM_ADMIN') {
    return { error: 'Unauthorized.' }
  }

  const name = (formData.get('platformName') as string | null)?.trim()
  if (!name || name.length < 2) {
    return { error: 'Platform name must be at least 2 characters.' }
  }
  if (name.length > 80) {
    return { error: 'Platform name must be 80 characters or fewer.' }
  }

  await prisma.appSetting.upsert({
    where: { key: 'platform_name' },
    create: { key: 'platform_name', value: name },
    update: { value: name },
  })

  revalidatePath('/admin/settings')
  return { success: true }
}

// ─── Badge Management ─────────────────────────────────────────────────────────

export async function createBadge(
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const session = await getCurrentUser()
  if (!session || session.role !== 'PLATFORM_ADMIN') {
    return { error: 'Unauthorized.' }
  }

  const key = (formData.get('key') as string | null)?.trim().toLowerCase().replace(/\s+/g, '_')
  const name = (formData.get('name') as string | null)?.trim()
  const description = (formData.get('description') as string | null)?.trim()
  const iconUrl = (formData.get('iconUrl') as string | null)?.trim() || null
  const isAutoRaw = formData.get('isAuto')
  const isAuto = isAutoRaw === 'true'

  if (!key || key.length < 2) return { error: 'Key must be at least 2 characters.' }
  if (!/^[a-z0-9_]+$/.test(key)) return { error: 'Key may only contain lowercase letters, numbers, and underscores.' }
  if (!name || name.length < 2) return { error: 'Name must be at least 2 characters.' }
  if (!description || description.length < 5) return { error: 'Description must be at least 5 characters.' }

  const existing = await prisma.badge.findUnique({ where: { key } })
  if (existing) return { error: `A badge with key "${key}" already exists.` }

  await prisma.badge.create({
    data: { key, name, description, iconUrl, isAuto },
  })

  revalidatePath('/admin/settings')
  return { success: true }
}

export async function deleteBadge(
  badgeId: string,
): Promise<{ error?: string; success?: boolean }> {
  const session = await getCurrentUser()
  if (!session || session.role !== 'PLATFORM_ADMIN') {
    return { error: 'Unauthorized.' }
  }

  const badge = await prisma.badge.findUnique({
    where: { id: badgeId },
    include: { _count: { select: { userBadges: true, challenges: true } } },
  })

  if (!badge) return { error: 'Badge not found.' }

  if (badge._count.userBadges > 0 || badge._count.challenges > 0) {
    return {
      error: `Cannot delete "${badge.name}" — it has been awarded to ${badge._count.userBadges} player(s) or is linked to ${badge._count.challenges} challenge(s).`,
    }
  }

  await prisma.badge.delete({ where: { id: badgeId } })
  revalidatePath('/admin/settings')
  return { success: true }
}
