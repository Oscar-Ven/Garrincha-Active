import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { CentersClient } from './centers-client'

export const metadata: Metadata = {
  title: 'Centers — Admin',
  description: 'Manage sports centers on Garrincha Active.',
}

// ─── Server Actions ───────────────────────────────────────────────────────────

export async function createCenter(formData: FormData): Promise<{ error?: string }> {
  'use server'
  const user = await getCurrentUser()
  if (!user || user.role !== 'PLATFORM_ADMIN') return { error: 'Unauthorized' }

  const name = (formData.get('name') as string | null)?.trim()
  const city = (formData.get('city') as string | null)?.trim() || null
  const address = (formData.get('address') as string | null)?.trim() || null
  const phone = (formData.get('phone') as string | null)?.trim() || null
  const email = (formData.get('email') as string | null)?.trim() || null
  const description = (formData.get('description') as string | null)?.trim() || null

  if (!name) return { error: 'Center name is required.' }

  const existing = await prisma.center.findUnique({ where: { name } })
  if (existing) return { error: 'A center with this name already exists.' }

  await prisma.center.create({
    data: { name, city, address, phone, email, description },
  })

  revalidatePath('/admin/centers')
  return {}
}

export async function updateCenter(formData: FormData): Promise<{ error?: string }> {
  'use server'
  const user = await getCurrentUser()
  if (!user || user.role !== 'PLATFORM_ADMIN') return { error: 'Unauthorized' }

  const id = (formData.get('id') as string | null)?.trim()
  if (!id) return { error: 'Missing center ID.' }

  const name = (formData.get('name') as string | null)?.trim()
  const city = (formData.get('city') as string | null)?.trim() || null
  const address = (formData.get('address') as string | null)?.trim() || null
  const phone = (formData.get('phone') as string | null)?.trim() || null
  const email = (formData.get('email') as string | null)?.trim() || null
  const description = (formData.get('description') as string | null)?.trim() || null

  if (!name) return { error: 'Center name is required.' }

  const conflict = await prisma.center.findFirst({ where: { name, NOT: { id } } })
  if (conflict) return { error: 'A center with this name already exists.' }

  await prisma.center.update({
    where: { id },
    data: { name, city, address, phone, email, description },
  })

  revalidatePath('/admin/centers')
  return {}
}

export async function toggleCenterActive(id: string, isActive: boolean): Promise<{ error?: string }> {
  'use server'
  const user = await getCurrentUser()
  if (!user || user.role !== 'PLATFORM_ADMIN') return { error: 'Unauthorized' }

  await prisma.center.update({ where: { id }, data: { isActive } })
  revalidatePath('/admin/centers')
  return {}
}

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getCenters() {
  return prisma.center.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { players: true } },
    },
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CentersPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'PLATFORM_ADMIN') redirect('/admin')

  const centers = await getCenters()

  const rows = centers.map((c) => ({
    id: c.id,
    name: c.name,
    city: c.city,
    address: c.address,
    phone: c.phone,
    email: c.email,
    description: c.description,
    isActive: c.isActive,
    playerCount: c._count.players,
    createdAt: c.createdAt.toISOString(),
  }))

  return (
    <CentersClient
      centers={rows}
      createCenter={createCenter}
      updateCenter={updateCenter}
      toggleCenterActive={toggleCenterActive}
    />
  )
}
