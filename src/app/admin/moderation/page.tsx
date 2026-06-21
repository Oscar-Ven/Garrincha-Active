import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { ModerationStatus, FeedPostType } from '@/generated/prisma'
import { cn, formatDateTime, truncate } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Content Moderation | Garrincha Admin',
  description: 'Review and moderate community feed posts',
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PostForModeration = {
  id: string
  type: FeedPostType
  content: string | null
  imageUrl: string | null
  moderationStatus: ModerationStatus
  createdAt: Date
  user: {
    id: string
    name: string
    nickname: string
    avatarUrl: string | null
  }
  _count: {
    reports: number
    comments: number
    reactions: number
  }
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getModerationQueue(): Promise<PostForModeration[]> {
  return prisma.feedPost.findMany({
    where: { moderationStatus: ModerationStatus.UNDER_REVIEW },
    include: {
      user: {
        select: { id: true, name: true, nickname: true, avatarUrl: true },
      },
      _count: {
        select: { reports: true, comments: true, reactions: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  }) as unknown as PostForModeration[]
}

async function getReportedPosts(): Promise<PostForModeration[]> {
  // Posts that have at least one unresolved report but are still VISIBLE
  const postIdsWithReports = await prisma.report.findMany({
    where: { resolved: false, postId: { not: null } },
    select: { postId: true },
    distinct: ['postId'],
  })

  const postIds = postIdsWithReports
    .map((r) => r.postId)
    .filter((id): id is string => id !== null)

  if (postIds.length === 0) return []

  return prisma.feedPost.findMany({
    where: {
      id: { in: postIds },
      moderationStatus: { not: ModerationStatus.UNDER_REVIEW },
    },
    include: {
      user: {
        select: { id: true, name: true, nickname: true, avatarUrl: true },
      },
      _count: {
        select: { reports: true, comments: true, reactions: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  }) as unknown as PostForModeration[]
}

async function getRecentlyHidden(): Promise<PostForModeration[]> {
  return prisma.feedPost.findMany({
    where: { moderationStatus: ModerationStatus.HIDDEN },
    include: {
      user: {
        select: { id: true, name: true, nickname: true, avatarUrl: true },
      },
      _count: {
        select: { reports: true, comments: true, reactions: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  }) as unknown as PostForModeration[]
}

// ─── Server Actions ───────────────────────────────────────────────────────────

async function approvePost(formData: FormData) {
  'use server'
  const postId = formData.get('postId') as string
  const adminUser = await getCurrentUser()
  if (!adminUser) redirect('/login')

  await prisma.$transaction([
    prisma.feedPost.update({
      where: { id: postId },
      data: { moderationStatus: ModerationStatus.VISIBLE },
    }),
    // Resolve all reports for this post
    prisma.report.updateMany({
      where: { postId, resolved: false },
      data: { resolved: true, resolvedAt: new Date() },
    }),
    prisma.adminAuditLog.create({
      data: {
        adminId: adminUser.id,
        action: 'APPROVE_POST',
        entityType: 'FeedPost',
        entityId: postId,
        details: `Post approved (set to VISIBLE) by admin ${adminUser.id}`,
      },
    }),
  ])

  revalidatePath('/admin/moderation')
}

async function hidePost(formData: FormData) {
  'use server'
  const postId = formData.get('postId') as string
  const adminUser = await getCurrentUser()
  if (!adminUser) redirect('/login')

  await prisma.$transaction([
    prisma.feedPost.update({
      where: { id: postId },
      data: { moderationStatus: ModerationStatus.HIDDEN },
    }),
    // Resolve all reports for this post
    prisma.report.updateMany({
      where: { postId, resolved: false },
      data: { resolved: true, resolvedAt: new Date() },
    }),
    prisma.adminAuditLog.create({
      data: {
        adminId: adminUser.id,
        action: 'HIDE_POST',
        entityType: 'FeedPost',
        entityId: postId,
        details: `Post hidden by admin ${adminUser.id}`,
      },
    }),
  ])

  revalidatePath('/admin/moderation')
}

async function unhidePost(formData: FormData) {
  'use server'
  const postId = formData.get('postId') as string
  const adminUser = await getCurrentUser()
  if (!adminUser) redirect('/login')

  await prisma.$transaction([
    prisma.feedPost.update({
      where: { id: postId },
      data: { moderationStatus: ModerationStatus.VISIBLE },
    }),
    prisma.adminAuditLog.create({
      data: {
        adminId: adminUser.id,
        action: 'UNHIDE_POST',
        entityType: 'FeedPost',
        entityId: postId,
        details: `Post unhidden (restored to VISIBLE) by admin ${adminUser.id}`,
      },
    }),
  ])

  revalidatePath('/admin/moderation')
}

async function markUnderReview(formData: FormData) {
  'use server'
  const postId = formData.get('postId') as string
  const adminUser = await getCurrentUser()
  if (!adminUser) redirect('/login')

  await prisma.$transaction([
    prisma.feedPost.update({
      where: { id: postId },
      data: { moderationStatus: ModerationStatus.UNDER_REVIEW },
    }),
    prisma.adminAuditLog.create({
      data: {
        adminId: adminUser.id,
        action: 'FLAG_POST_UNDER_REVIEW',
        entityType: 'FeedPost',
        entityId: postId,
        details: `Post marked UNDER_REVIEW by admin ${adminUser.id}`,
      },
    }),
  ])

  revalidatePath('/admin/moderation')
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PostTypeBadge({ type }: { type: FeedPostType }) {
  const labels: Record<FeedPostType, string> = {
    ACTIVITY: 'Activity',
    BADGE: 'Badge',
    CHALLENGE_COMPLETION: 'Challenge',
    REWARD_REDEMPTION: 'Reward',
    EVENT_REGISTRATION: 'Event',
    TEAM_JOIN: 'Team',
    PERSONAL_RECORD: 'Personal Record',
    CUSTOM: 'Custom',
    MATCH_RESULT: 'Match',
  }

  const colors: Record<FeedPostType, string> = {
    ACTIVITY: 'bg-blue-900/40 text-blue-300 ring-blue-700/30',
    BADGE: 'bg-yellow-900/40 text-yellow-300 ring-yellow-700/30',
    CHALLENGE_COMPLETION: 'bg-purple-900/40 text-purple-300 ring-purple-700/30',
    REWARD_REDEMPTION: 'bg-green-900/40 text-green-300 ring-green-700/30',
    EVENT_REGISTRATION: 'bg-orange-900/40 text-orange-300 ring-orange-700/30',
    TEAM_JOIN: 'bg-cyan-900/40 text-cyan-300 ring-cyan-700/30',
    PERSONAL_RECORD: 'bg-yellow-900/40 text-yellow-300 ring-yellow-700/30',
    CUSTOM: 'bg-slate-700/60 text-slate-300 ring-slate-600/30',
    MATCH_RESULT: 'bg-green-900/40 text-green-300 ring-green-700/30',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1',
        colors[type],
      )}
    >
      {labels[type]}
    </span>
  )
}

function StatusBadge({ status }: { status: ModerationStatus }) {
  if (status === ModerationStatus.UNDER_REVIEW) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-300 ring-1 ring-amber-700/30">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Under Review
      </span>
    )
  }
  if (status === ModerationStatus.HIDDEN) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-900/40 px-2 py-0.5 text-xs font-medium text-red-300 ring-1 ring-red-700/30">
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
        Hidden
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-300 ring-1 ring-green-700/30">
      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
      Visible
    </span>
  )
}

function UserAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-700"
      />
    )
  }
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-200 ring-1 ring-slate-600">
      {initials}
    </div>
  )
}

interface PostRowProps {
  post: PostForModeration
  showApprove?: boolean
  showHide?: boolean
  showUnhide?: boolean
  showMarkReview?: boolean
}

function PostRow({ post, showApprove, showHide, showUnhide, showMarkReview }: PostRowProps) {
  const contentPreview = post.content
    ? truncate(post.content, 120)
    : post.type !== 'CUSTOM'
      ? `[${post.type.replace(/_/g, ' ').toLowerCase()} post]`
      : '—'

  return (
    <tr className="border-b border-slate-700/50 hover:bg-slate-800/40 transition-colors">
      {/* User */}
      <td className="py-3 pl-4 pr-3">
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar name={post.user.name} avatarUrl={post.user.avatarUrl} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-100">{post.user.name}</p>
            <p className="truncate text-xs text-slate-400">@{post.user.nickname}</p>
          </div>
        </div>
      </td>

      {/* Type + Content */}
      <td className="px-3 py-3">
        <div className="flex flex-col gap-1.5 min-w-0">
          <PostTypeBadge type={post.type} />
          <p className="text-xs text-slate-400 leading-relaxed">{contentPreview}</p>
        </div>
      </td>

      {/* Reports */}
      <td className="px-3 py-3 text-center">
        {post._count.reports > 0 ? (
          <span className="inline-flex items-center justify-center rounded-full bg-red-900/50 px-2.5 py-0.5 text-xs font-bold text-red-300 ring-1 ring-red-700/40">
            {post._count.reports}
          </span>
        ) : (
          <span className="text-xs text-slate-600">0</span>
        )}
      </td>

      {/* Status */}
      <td className="px-3 py-3">
        <StatusBadge status={post.moderationStatus} />
      </td>

      {/* Date */}
      <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">
        {formatDateTime(post.createdAt)}
      </td>

      {/* Actions */}
      <td className="py-3 pl-3 pr-4">
        <div className="flex items-center gap-2 flex-wrap">
          {showApprove && (
            <form action={approvePost}>
              <input type="hidden" name="postId" value={post.id} />
              <button
                type="submit"
                className="rounded-md bg-green-700/30 px-3 py-1.5 text-xs font-medium text-green-300 ring-1 ring-green-600/40 transition-colors hover:bg-green-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                Approve
              </button>
            </form>
          )}

          {showHide && (
            <form action={hidePost}>
              <input type="hidden" name="postId" value={post.id} />
              <button
                type="submit"
                className="rounded-md bg-red-900/30 px-3 py-1.5 text-xs font-medium text-red-300 ring-1 ring-red-700/40 transition-colors hover:bg-red-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                Hide
              </button>
            </form>
          )}

          {showUnhide && (
            <form action={unhidePost}>
              <input type="hidden" name="postId" value={post.id} />
              <button
                type="submit"
                className="rounded-md bg-slate-700/50 px-3 py-1.5 text-xs font-medium text-slate-300 ring-1 ring-slate-600/40 transition-colors hover:bg-slate-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              >
                Unhide
              </button>
            </form>
          )}

          {showMarkReview && (
            <form action={markUnderReview}>
              <input type="hidden" name="postId" value={post.id} />
              <button
                type="submit"
                className="rounded-md bg-amber-900/30 px-3 py-1.5 text-xs font-medium text-amber-300 ring-1 ring-amber-700/40 transition-colors hover:bg-amber-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                Flag Review
              </button>
            </form>
          )}
        </div>
      </td>
    </tr>
  )
}

function PostsTable({
  posts,
  showApprove,
  showHide,
  showUnhide,
  showMarkReview,
  emptyMessage,
}: {
  posts: PostForModeration[]
  showApprove?: boolean
  showHide?: boolean
  showUnhide?: boolean
  showMarkReview?: boolean
  emptyMessage: string
}) {
  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/30 px-6 py-10 text-center">
        <svg
          className="mx-auto mb-3 h-8 w-8 text-slate-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-900">
      <table className="min-w-full text-sm" aria-label="Posts table">
        <thead>
          <tr className="border-b border-slate-700/60 bg-slate-800/60">
            <th
              scope="col"
              className="py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              User
            </th>
            <th
              scope="col"
              className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              Content
            </th>
            <th
              scope="col"
              className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              Reports
            </th>
            <th
              scope="col"
              className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              Status
            </th>
            <th
              scope="col"
              className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              Created
            </th>
            <th
              scope="col"
              className="py-3 pl-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <PostRow
              key={post.id}
              post={post}
              showApprove={showApprove}
              showHide={showHide}
              showUnhide={showUnhide}
              showMarkReview={showMarkReview}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SectionHeader({
  title,
  description,
  count,
  countColor = 'bg-slate-700 text-slate-300',
}: {
  title: string
  description: string
  count: number
  countColor?: string
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        <p className="mt-0.5 text-sm text-slate-400">{description}</p>
      </div>
      <span
        className={cn(
          'mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums',
          countColor,
        )}
      >
        {count}
      </span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ModerationPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'PLATFORM_ADMIN' && user.role !== 'CENTER_ADMIN') redirect('/app')

  const [reviewQueue, reportedPosts, hiddenPosts] = await Promise.all([
    getModerationQueue(),
    getReportedPosts(),
    getRecentlyHidden(),
  ])

  const totalPending = reviewQueue.length + reportedPosts.length

  return (
    <div className="space-y-10">
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Content Moderation</h1>
          <p className="mt-1 text-sm text-slate-400">
            Review reported and flagged feed posts. Approve, hide, or restore content.
          </p>
        </div>

        {totalPending > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-700/40 bg-amber-900/20 px-4 py-2.5">
            <svg
              className="h-4 w-4 shrink-0 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <span className="text-sm font-medium text-amber-300">
              {totalPending} item{totalPending !== 1 ? 's' : ''} need attention
            </span>
          </div>
        )}
      </div>

      {/* ── Summary stats ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Under Review',
            value: reviewQueue.length,
            icon: (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            ),
            iconBg: 'bg-amber-600/10 text-amber-400',
            border: 'border-amber-700/20',
          },
          {
            label: 'Reported (Visible)',
            value: reportedPosts.length,
            icon: (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l1.664 1.664M21 21l-1.5-1.5m-5.485-1.242L12 17.25 4.5 21V8.742m.164-4.078a2.15 2.15 0 011.743-1.342 48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185V19.5M4.664 4.664L19.5 19.5" />
              </svg>
            ),
            iconBg: 'bg-red-600/10 text-red-400',
            border: 'border-red-700/20',
          },
          {
            label: 'Hidden Posts',
            value: hiddenPosts.length,
            icon: (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ),
            iconBg: 'bg-slate-600/30 text-slate-400',
            border: 'border-slate-700/30',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={cn(
              'flex items-center gap-4 rounded-xl border bg-slate-800/60 p-5',
              stat.border,
            )}
          >
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                stat.iconBg,
              )}
            >
              {stat.icon}
            </div>
            <div>
              <p className="text-xs text-slate-400">{stat.label}</p>
              <p className="text-2xl font-bold tabular-nums text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Under-review queue ── */}
      <section aria-labelledby="review-queue-heading">
        <SectionHeader
          title="Moderation Queue"
          description="Posts flagged as UNDER_REVIEW awaiting an admin decision."
          count={reviewQueue.length}
          countColor={
            reviewQueue.length > 0
              ? 'bg-amber-900/50 text-amber-300 ring-1 ring-amber-700/40'
              : 'bg-slate-700 text-slate-400'
          }
        />
        <PostsTable
          posts={reviewQueue}
          showApprove
          showHide
          emptyMessage="No posts currently under review. All clear!"
        />
      </section>

      {/* ── Reported posts (still visible) ── */}
      <section aria-labelledby="reported-heading">
        <SectionHeader
          title="Reported Posts"
          description="Visible posts with unresolved user reports. Review and take action."
          count={reportedPosts.length}
          countColor={
            reportedPosts.length > 0
              ? 'bg-red-900/50 text-red-300 ring-1 ring-red-700/40'
              : 'bg-slate-700 text-slate-400'
          }
        />
        <PostsTable
          posts={reportedPosts}
          showApprove
          showHide
          showMarkReview
          emptyMessage="No reported posts awaiting review."
        />
      </section>

      {/* ── Recently hidden ── */}
      <section aria-labelledby="hidden-heading">
        <SectionHeader
          title="Hidden Content"
          description="Posts that have been hidden from the feed. You can restore them at any time."
          count={hiddenPosts.length}
          countColor="bg-slate-700 text-slate-400"
        />
        <PostsTable
          posts={hiddenPosts}
          showUnhide
          emptyMessage="No hidden posts."
        />
      </section>
    </div>
  )
}
