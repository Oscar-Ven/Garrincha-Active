import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ModerationStatus } from '@/generated/prisma'
import { cn, formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Moderation — Admin' }

// ─── Server Actions ────────────────────────────────────────────────────────────

async function approvePost(formData: FormData) {
  'use server'
  const admin = await getCurrentUser()
  if (!admin || admin.role !== 'PLATFORM_ADMIN') throw new Error('Unauthorized')
  await prisma.feedPost.update({
    where: { id: formData.get('postId') as string },
    data: { moderationStatus: ModerationStatus.VISIBLE },
  })
  revalidatePath('/admin/moderation')
}

async function hidePost(formData: FormData) {
  'use server'
  const admin = await getCurrentUser()
  if (!admin || admin.role !== 'PLATFORM_ADMIN') throw new Error('Unauthorized')
  await prisma.feedPost.update({
    where: { id: formData.get('postId') as string },
    data: { moderationStatus: ModerationStatus.HIDDEN },
  })
  revalidatePath('/admin/moderation')
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UserAvatar({ user }: { user: { name: string; avatarUrl: string | null } }) {
  return (
    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
      {user.avatarUrl ? (
        <Image src={user.avatarUrl} alt={user.name} width={32} height={32} className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-surface-container text-xs font-bold text-on-surface ring-1 ring-white/10">
          {user.name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  )
}

function PostStatusBadge({ status }: { status: ModerationStatus }) {
  const map: Record<ModerationStatus, { label: string; className: string }> = {
    VISIBLE:      { label: 'Visible',      className: 'bg-primary-fixed/10 text-primary-fixed' },
    UNDER_REVIEW: { label: 'Under Review', className: 'bg-red-500/15 text-red-400' },
    HIDDEN:       { label: 'Hidden',       className: 'bg-surface-container text-on-surface-variant' },
  }
  const { label, className } = map[status]
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', className)}>
      {label}
    </span>
  )
}

type PostRow = {
  id: string
  content: string | null
  moderationStatus: ModerationStatus
  createdAt: Date
  user: { id: string; name: string; nickname: string; avatarUrl: string | null }
  _count: { comments: number; reactions: number; reports: number }
}

function PostsTable({ posts }: { posts: PostRow[] }) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 glass-card py-16 text-center">
        <span className="material-symbols-outlined text-on-surface-variant/40" style={{ fontSize: '40px' }}>verified</span>
        <p className="text-sm font-semibold text-on-surface">No posts to review</p>
        <p className="text-xs text-on-surface-variant">All clear — nothing matches this filter.</p>
      </div>
    )
  }

  return (
    <div className="glass-card overflow-hidden rounded-xl border border-white/10">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-surface-container">
            {['Author', 'Content', 'Reports', 'Stats', 'Status', 'Date', 'Actions'].map((col) => (
              <th key={col} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {posts.map((post) => (
            <tr key={post.id} className="border-white/10 transition-colors hover:bg-surface-container-high">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <UserAvatar user={post.user} />
                  <div className="min-w-0">
                    <Link href={`/admin/players/${post.user.id}`} className="block truncate font-medium text-on-surface max-w-24 hover:text-primary-fixed">
                      {post.user.name}
                    </Link>
                    <p className="truncate text-xs text-on-surface-variant max-w-24">@{post.user.nickname}</p>
                  </div>
                </div>
              </td>
              <td className="max-w-56 px-4 py-3">
                <p className="line-clamp-2 text-on-surface">{post.content ?? <span className="italic text-on-surface-variant/50">No text content</span>}</p>
              </td>
              <td className="px-4 py-3 text-center">
                {post._count.reports > 0 ? (
                  <span className="font-semibold text-red-400 tabular-nums">{post._count.reports}</span>
                ) : (
                  <span className="text-on-surface-variant/30">—</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>favorite</span>
                    {post._count.reactions}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>chat_bubble</span>
                    {post._count.comments}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <PostStatusBadge status={post.moderationStatus} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-on-surface-variant">
                {formatDate(post.createdAt)}
              </td>
              <td className="px-4 py-3">
                {post.moderationStatus === ModerationStatus.UNDER_REVIEW && (
                  <div className="flex items-center gap-2">
                    <form action={approvePost}>
                      <input type="hidden" name="postId" value={post.id} />
                      <button type="submit" className="inline-flex items-center gap-1 rounded-lg border border-primary-fixed/40 bg-primary-fixed/10 px-2.5 py-1 text-xs font-semibold text-primary-fixed transition-colors hover:bg-primary-fixed/20">
                        <span className="material-symbols-outlined" style={{ fontSize: '12px', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        Approve
                      </button>
                    </form>
                    <form action={hidePost}>
                      <input type="hidden" name="postId" value={post.id} />
                      <button type="submit" className="inline-flex items-center gap-1 rounded-lg border border-error/40 bg-error/10 px-2.5 py-1 text-xs font-semibold text-error transition-colors hover:bg-error/20">
                        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>hide</span>
                        Hide
                      </button>
                    </form>
                  </div>
                )}
                {post.moderationStatus === ModerationStatus.VISIBLE && (
                  <form action={hidePost}>
                    <input type="hidden" name="postId" value={post.id} />
                    <button type="submit" className="inline-flex items-center gap-1 rounded-lg border border-error/40 bg-error/10 px-2.5 py-1 text-xs font-semibold text-error transition-colors hover:bg-error/20">
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>hide</span>
                      Hide
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SectionHeader({ title, count, icon }: { title: string; count: number; icon: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>{icon}</span>
      <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-surface-container px-2 text-xs font-bold text-on-surface-variant tabular-nums">
        {count}
      </span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminModerationPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'PLATFORM_ADMIN') redirect('/app')

  const [flaggedPosts, recentPosts, summaryCounts] = await Promise.all([
    prisma.feedPost.findMany({
      where: { moderationStatus: ModerationStatus.UNDER_REVIEW },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
        _count: { select: { comments: true, reactions: true, reports: true } },
      },
    }),
    prisma.feedPost.findMany({
      where: { moderationStatus: { in: [ModerationStatus.VISIBLE, ModerationStatus.HIDDEN] } },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        user: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
        _count: { select: { comments: true, reactions: true, reports: true } },
      },
    }),
    prisma.feedPost.groupBy({ by: ['moderationStatus'], _count: { id: true } }),
  ])

  const countMap: Record<string, number> = {}
  for (const row of summaryCounts) { countMap[row.moderationStatus] = row._count.id }

  const summaryStats = [
    { label: 'Under Review', value: countMap[ModerationStatus.UNDER_REVIEW] ?? 0, colorClass: 'text-red-400',       bg: 'bg-red-600/10',       icon: 'flag' },
    { label: 'Visible',      value: countMap[ModerationStatus.VISIBLE] ?? 0,      colorClass: 'text-primary-fixed', bg: 'bg-primary-fixed/10', icon: 'check_circle' },
    { label: 'Hidden',       value: countMap[ModerationStatus.HIDDEN] ?? 0,       colorClass: 'text-on-surface-variant', bg: 'bg-surface-container', icon: 'hide' },
    { label: 'Total Posts',  value: Object.values(countMap).reduce((s, n) => s + n, 0), colorClass: 'text-on-surface', bg: 'bg-surface-container', icon: 'article' },
  ]

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Moderation</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Review flagged posts and manage community content.</p>
      </div>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summaryStats.map(({ label, value, colorClass, bg, icon }) => (
          <div key={label} className="glass-card flex items-center gap-3 rounded-xl p-4">
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', bg, colorClass)}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>{icon}</span>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">{label}</p>
              <p className={cn('text-2xl font-bold tabular-nums', colorClass)}>{value.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Under review posts ── */}
      <section className="space-y-4">
        <SectionHeader title="Under Review" count={flaggedPosts.length} icon="flag" />
        <PostsTable posts={flaggedPosts as PostRow[]} />
      </section>

      {/* ── Recent posts ── */}
      <section className="space-y-4">
        <SectionHeader title="Recent Posts" count={recentPosts.length} icon="article" />
        <PostsTable posts={recentPosts as PostRow[]} />
      </section>
    </div>
  )
}
