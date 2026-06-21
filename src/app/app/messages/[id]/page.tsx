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

  await prisma.directMessage.updateMany({
    where: { conversationId: id, senderId: { not: user.id }, isRead: false },
    data: { isRead: true },
  })

  const displayName = otherUser?.nickname ?? otherUser?.name ?? 'User'
  const inits = displayName[0]?.toUpperCase() ?? '?'

  return (
    <div className="mx-auto flex max-w-lg flex-col" style={{ height: 'calc(100dvh - 7rem)' }}>
      {/* Thread header */}
      <div className="flex shrink-0 items-center gap-md border-b border-white/5 pb-md mb-md">
        <Link
          href="/app/messages"
          className="flex h-9 w-9 items-center justify-center rounded-full glass-card text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed text-sm font-bold overflow-hidden shrink-0">
          {otherUser?.avatarUrl
            ? <img src={otherUser.avatarUrl} alt="" className="h-full w-full object-cover" />
            : inits
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-body-md font-bold text-on-surface truncate">{displayName}</p>
        </div>
        <Link href={`/app/players/${otherId}`} className="text-label-caps text-on-surface-variant hover:text-on-surface transition-colors shrink-0">
          View Profile
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-sm pr-1 scrollbar-none">
        {conv.messages.length === 0 && (
          <div className="py-12 text-center">
            <span
              className="material-symbols-outlined text-on-surface-variant"
              style={{ fontSize: '32px', fontVariationSettings: "'FILL' 1" }}
            >
              waving_hand
            </span>
            <p className="text-label-caps text-on-surface-variant mt-sm">Send a message to start the conversation</p>
          </div>
        )}

        {conv.messages.map((msg) => {
          const isMine = msg.senderId === user.id
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${isMine ? '' : 'flex items-end gap-2'}`}>
                {!isMine && (
                  <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container-highest text-on-surface text-xs font-bold overflow-hidden">
                    {otherUser?.avatarUrl
                      ? <img src={otherUser.avatarUrl} alt="" className="h-full w-full object-cover" />
                      : inits
                    }
                  </div>
                )}
                <div>
                  <div
                    className={`rounded-2xl px-md py-sm text-body-md leading-relaxed ${
                      isMine
                        ? 'rounded-br-sm bg-primary-fixed text-on-primary-fixed'
                        : 'rounded-bl-sm glass-card text-on-surface'
                    }`}
                  >
                    {msg.body}
                  </div>
                  <p className={`mt-1 text-label-caps text-on-surface-variant ${isMine ? 'text-right' : 'text-left'}`}>
                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Send form */}
      <div className="shrink-0 -mx-4 mt-md">
        <SendForm conversationId={id} />
      </div>
    </div>
  )
}
