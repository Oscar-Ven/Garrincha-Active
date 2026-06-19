import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { SendForm } from './SendForm'

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { id } = await params

  const conv = await prisma.conversation.findFirst({
    where: {
      id,
      OR: [{ participantA: user.id }, { participantB: user.id }],
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!conv) redirect('/app/messages')

  const otherId = conv.participantA === user.id ? conv.participantB : conv.participantA
  const otherUser = await prisma.user.findUnique({
    where: { id: otherId },
    select: { id: true, name: true, nickname: true, avatarUrl: true },
  })

  // Mark incoming messages as read
  await prisma.directMessage.updateMany({
    where: { conversationId: id, senderId: { not: user.id }, isRead: false },
    data: { isRead: true },
  })

  const displayName = otherUser?.nickname ?? otherUser?.name ?? 'User'
  const initials = displayName[0]?.toUpperCase() ?? '?'

  return (
    <div className="mx-auto flex max-w-lg flex-col" style={{ height: 'calc(100dvh - 7rem)' }}>
      {/* Thread header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-800 pb-4 mb-4">
        <Link href="/app/messages" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-green-600 to-emerald-700 text-sm font-bold text-white overflow-hidden">
          {otherUser?.avatarUrl
            ? <img src={otherUser.avatarUrl} alt="" className="h-full w-full object-cover" />
            : initials
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{displayName}</p>
        </div>
        <Link href={`/app/players/${otherId}`} className="text-xs text-slate-400 hover:text-white transition-colors">
          View Profile
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {conv.messages.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-2xl mb-2">👋</p>
            <p className="text-sm text-slate-400">Send a message to start the conversation</p>
          </div>
        )}

        {conv.messages.map((msg) => {
          const isMine = msg.senderId === user.id
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${isMine ? '' : 'flex items-end gap-2'}`}>
                {!isMine && (
                  <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-green-600 to-emerald-700 text-xs font-bold text-white overflow-hidden">
                    {otherUser?.avatarUrl
                      ? <img src={otherUser.avatarUrl} alt="" className="h-full w-full object-cover" />
                      : initials
                    }
                  </div>
                )}
                <div>
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      isMine
                        ? 'rounded-br-sm bg-green-600 text-white'
                        : 'rounded-bl-sm bg-slate-800 text-slate-100'
                    }`}
                  >
                    {msg.body}
                  </div>
                  <p className={`mt-1 text-[10px] text-slate-500 ${isMine ? 'text-right' : 'text-left'}`}>
                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Send form */}
      <div className="shrink-0 -mx-4 mt-3">
        <SendForm conversationId={id} />
      </div>
    </div>
  )
}
