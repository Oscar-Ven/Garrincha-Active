import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Bell, Check } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'

export const metadata = { title: 'Notifications | Garrincha Active' }

const TYPE_ICONS: Record<string, string> = {
  BADGE_AWARDED: '🏅',
  CHALLENGE_COMPLETED: '🏆',
  REWARD_REDEEMED: '🎁',
  EVENT_REGISTERED: '📅',
  NEW_FOLLOWER: '👤',
  ACTIVITY_LIKED: '❤️',
  COMMENT_RECEIVED: '💬',
  ADMIN_MESSAGE: '📢',
  POINTS_RECEIVED: '⭐',
  PERSONAL_RECORD: '🥇',
  SEGMENT_RECORD: '⚡',
  DIRECT_CHALLENGE_RECEIVED: '⚔️',
  DIRECT_CHALLENGE_ACCEPTED: '✅',
  AUCTION_OUTBID: '🔔',
  AUCTION_WON: '🎉',
  STREAK_SHIELD_USED: '🛡️',
}

async function markAllRead(userId: string) {
  'use server'
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  })
  revalidatePath('/app/notifications')
}

export default async function NotificationsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-slate-400" />
            Notifications
          </h1>
          {unreadCount > 0 && (
            <p className="text-sm text-slate-400 mt-1">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <form action={markAllRead.bind(null, user.id)}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              Mark all read
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="flex flex-col items-center py-16 gap-3">
            <Bell className="h-10 w-10 text-slate-600" />
            <p className="text-slate-400 text-sm">No notifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
                n.isRead
                  ? 'border-slate-700 bg-slate-800/40'
                  : 'border-green-800/40 bg-green-950/20'
              }`}
            >
              <span className="text-xl shrink-0 mt-0.5">{TYPE_ICONS[n.type] ?? '🔔'}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${n.isRead ? 'text-slate-300' : 'text-white'}`}>
                  {n.title}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{n.body}</p>
                <p className="text-xs text-slate-600 mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </div>
              {!n.isRead && (
                <div className="h-2 w-2 rounded-full bg-green-500 shrink-0 mt-2" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
