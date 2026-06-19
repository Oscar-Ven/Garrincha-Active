'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { GoalType, GoalPeriod } from '@/generated/prisma'

function periodDates(period: GoalPeriod, customStart?: string, customEnd?: string) {
  const now = new Date()
  if (period === 'WEEKLY') {
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((day + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    return { startDate: monday, endDate: sunday }
  }
  if (period === 'MONTHLY') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return { startDate: start, endDate: end }
  }
  // CUSTOM
  return {
    startDate: customStart ? new Date(customStart) : now,
    endDate: customEnd ? new Date(customEnd) : now,
  }
}

export async function createGoal(formData: FormData): Promise<void> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const title = (formData.get('title') as string)?.trim()
  const type = formData.get('type') as GoalType
  const period = formData.get('period') as GoalPeriod
  const targetValue = parseFloat(formData.get('targetValue') as string)
  const customStart = formData.get('customStart') as string | null
  const customEnd = formData.get('customEnd') as string | null

  if (!title || title.length > 80) return
  if (!Object.values(GoalType).includes(type)) return
  if (!Object.values(GoalPeriod).includes(period)) return
  if (isNaN(targetValue) || targetValue <= 0) return
  if (period === 'CUSTOM' && (!customStart || !customEnd)) return

  const { startDate, endDate } = periodDates(period, customStart ?? undefined, customEnd ?? undefined)
  if (endDate <= startDate) return

  await prisma.goal.create({
    data: { userId: user.id, title, type, period, targetValue, startDate, endDate },
  })

  revalidatePath('/app/goals')
}

export async function deleteGoal(goalId: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  await prisma.goal.deleteMany({ where: { id: goalId, userId: user.id } })
  revalidatePath('/app/goals')
}

export async function toggleGoal(goalId: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId: user.id } })
  if (!goal) return
  await prisma.goal.update({ where: { id: goalId }, data: { isActive: !goal.isActive } })
  revalidatePath('/app/goals')
}
