import { prisma } from '@/lib/db'
import type { NotificationType } from '@/generated/prisma'
import { sendPushToUser } from '@/lib/push'

interface NotifyPayload {
  type: NotificationType
  title: string
  body: string
  linkUrl?: string
}

/** Creates a DB Notification record and fires a Web Push to all user devices.
 *  Use this instead of bare prisma.notification.create so push delivery is automatic. */
export async function notifyUser(userId: string, payload: NotifyPayload): Promise<void> {
  await prisma.notification.create({
    data: {
      userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      linkUrl: payload.linkUrl ?? null,
    },
  })

  // Fire-and-forget — push failure must never break the calling request
  sendPushToUser(userId, {
    title: payload.title,
    body: payload.body,
    url: payload.linkUrl,
  }).catch((err) => console.error('[Push]', err))
}
