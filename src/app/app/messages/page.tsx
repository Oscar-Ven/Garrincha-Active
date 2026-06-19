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
    <div className="mx-auto max-w-lg">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Messages</h1>
          {totalUnread > 0 && (
            <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold text-white">
              {totalUnread}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-400">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </p>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800 px-6 py-16 text-center">
          <p className="mb-3 text-3xl">💬</p>
          <p className="font-semibold text-white">No messages yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Message a player from their profile page or the community feed
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
          {conversations.map((conv) => {
            const otherId =
              conv.participantA === user.id ? conv.participantB : conv.participantA
            const other = userMap.get(otherId)
            const lastMsg = conv.messages[0]
            const unread = unreadMap.get(conv.id) ?? 0
            const displayName = other?.nickname ?? other?.name ?? 'Unknown User'
            const initials = displayName[0]?.toUpperCase() ?? '?'

            return (
              <Link
                key={conv.id}
                href={`/app/messages/${conv.id}`}
                className="flex items-center gap-3 px-4 py-4 hover:bg-slate-800 transition-colors active:bg-slate-800"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-green-600 to-emerald-700 text-lg font-bold text-white">
                    {other?.avatarUrl ? (
                      <img src={other.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  {unread > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`truncate font-semibold ${unread > 0 ? 'text-white' : 'text-slate-200'}`}
                    >
                      {displayName}
                    </span>
                    {lastMsg && (
                      <span className="shrink-0 text-xs text-slate-500">
                        {formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  {lastMsg && (
                    <p
                      className={`mt-0.5 truncate text-sm ${
                        unread > 0 ? 'font-medium text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {lastMsg.senderId === user.id ? 'You: ' : ''}
                      {lastMsg.body}
                    </p>
                  )}
                </div>

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 shrink-0 text-slate-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
