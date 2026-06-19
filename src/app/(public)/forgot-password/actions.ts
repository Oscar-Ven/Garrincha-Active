'use server'

import { prisma } from '@/lib/db'
import { sendPasswordResetEmail } from '@/services/email-service'
import { randomBytes } from 'crypto'

type State = { error: string; success: boolean }

export async function forgotPasswordAction(_prev: State, formData: FormData): Promise<State> {
  const email = (formData.get('email') as string | null)?.trim().toLowerCase() ?? ''

  if (!email) return { error: 'Email is required.', success: false }

  // Always return success to prevent email enumeration
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } })

  if (user) {
    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: token, resetPasswordExpires: expires },
    })

    await sendPasswordResetEmail(email, user.name, token)
  }

  return { error: '', success: true }
}
