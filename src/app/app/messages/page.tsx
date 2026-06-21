import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export default async function MessagesPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ participantA: user.id }, { participantB: user.id }],
    },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { lastMessageAt: 'desc' },
  })

  const otherIds = [
    ...new Set(
      conversations.map((c) =>
        c.participantA === user.id ? c.participantB : c.participantA,
      ),
    ),
  ]

  const [otherUsers, unreadGroups] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: otherIds } },
      select: { id: true, name: true, nickname: true, avatarUrl: true },
    }),
    prisma.directMessage.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: conversations.map((c) => c.id) },
        senderId: { not: user.id },
        isRead: false,
      },
      _count: { id: true },
    }),
  ])

  const userMap = new Map(otherUsers.map((u) => [u.id, u]))
  const unreadMap = new Map(unreadGroups.map((r) => [r.conversationId, r._count.id]))
  const totalUnread = unreadGroups.reduce((sum, r) => sum + r._count.id, 0)

  return (
    <div className="mx-auto max-w-lg space-y-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-md font-black italic tracking-tight text-primary-fixed">Messages</h1>
          <p className="text-label-caps text-on-surface-variant mt-xs">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>
        {totalUnread > 0 && (
          <span className="rounded-full bg-primary-fixed text-on-primary-fixed px-2 py-0.5 text-label-caps font-bold">
            {totalUnread}
          </span>
        )}
      </div>

      {conversations.length === 0 ? (
        <div className="glass-card rounded-xl px-6 py-16 flex flex-col items-center text-center border border-dashed border-white/10">
          <span className="material-symbols-outlined text-on-surface-variant mb-sm" style={{ fontSize: '40px' }}>
            chat_bubble
          </span>
          <p className="text-body-md font-bold text-on-surface">No messages yet</p>
          <p className="text-label-caps text-on-surface-variant mt-xs">
            Message a player from their profile page or the community feed
          </p>
        </div>
      ) : (
        <div className="glass-card rounded-xl divide-y divide-white/5 overflow-hidden">
          {conversations.map((conv) => {
            const otherId =
              conv.participantA === user.id ? conv.participantB : conv.participantA
            const other = userMap.get(otherId)
            const lastMsg = conv.messages[0]
            const unread = unreadMap.get(conv.id) ?? 0
            const displayName = other?.nickname ?? other?.name ?? 'Unknown User'
            const inits = displayName[0]?.toUpperCase() ?? '?'

            return (
              <Link
                key={conv.id}
                href={`/app/messages/${conv.id}`}
                className="flex items-center gap-md px-md py-md hover:bg-surface-container-high transition-colors active:bg-surface-container-high"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary-fixed text-on-primary-fixed text-sm font-bold">
                    {other?.avatarUrl ? (
                      <img src={other.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      inits
                    )}
                  </div>
                  {unread > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed text-[10px] font-bold">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`truncate text-body-md font-bold ${unread > 0 ? 'text-white' : 'text-on-surface'}`}>
                      {displayName}
                    </span>
                    {lastMsg && (
                      <span className="shrink-0 text-label-caps text-on-surface-variant">
                        {formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  {lastMsg && (
                    <p className={`mt-0.5 truncate text-label-caps ${unread > 0 ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                      {lastMsg.senderId === user.id ? 'You: ' : ''}
                      {lastMsg.body}
                    </p>
                  )}
                </div>

                <span className="material-symbols-outlined text-on-surface-variant shrink-0" style={{ fontSize: '18px' }}>
                  chevron_right
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
