'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export type SendMessageState = { error?: string }

export async function sendMessageAction(
  _prev: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const conversationId = formData.get('conversationId') as string
  const body = (formData.get('body') as string | null)?.trim() ?? ''

  if (!body) return { error: 'Message cannot be empty' }
  if (body.length > 1000) return { error: 'Message too long (max 1000 characters)' }

  const conv = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ participantA: user.id }, { participantB: user.id }],
    },
  })
  if (!conv) return { error: 'Conversation not found' }

  await prisma.$transaction([
    prisma.directMessage.create({
      data: { conversationId, senderId: user.id, body },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    }),
  ])

  revalidatePath(`/app/messages/${conversationId}`)
  return {}
}
