'use server'

import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

type State = { error: string; success: boolean }

export async function resetPasswordAction(token: string, _prev: State, formData: FormData): Promise<State> {
  const password = (formData.get('password') as string | null) ?? ''
  const confirmPassword = (formData.get('confirmPassword') as string | null) ?? ''

  if (!password || password.length < 8) return { error: 'Password must be at least 8 characters.', success: false }
  if (password !== confirmPassword) return { error: 'Passwords do not match.', success: false }

  const user = await prisma.user.findFirst({
    where: { resetPasswordToken: token, resetPasswordExpires: { gt: new Date() } },
    select: { id: true },
  })

  if (!user) return { error: 'This link has expired. Please request a new password reset.', success: false }

  const passwordHash = await hashPassword(password)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    },
  })

  return { error: '', success: true }
}
