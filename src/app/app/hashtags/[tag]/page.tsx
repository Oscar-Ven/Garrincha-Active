import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { ActivityStatus, ActivityVisibility } from '@/generated/prisma'
import { cn, activityTypeLabel, formatDate, formatDistance, formatDuration } from '@/lib/utils'

const ACTIVITY_ICONS: Record<string, string> = {
  RUNNING: '🏃', CYCLING: '🚴', SWIMMING: '🏊', FOOTBALL_TRAINING: '⚽',
  PADEL: '🎾', GYM: '🏋️', YOGA: '🧘', HIKING: '🥾', BASKETBALL: '🏀', TENNIS: '🎾',
}
function activityTypeIcon(type: string): string {
  return ACTIVITY_ICONS[type] ?? '🏅'
}

type Props = {
  params: Promise<{ tag: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params
  return {
    title: `#${tag} — Garrincha Active`,
    description: `Activities and posts tagged with #${tag}`,
  }
}

async function getHashtagData(name: string) {
  const hashtag = await prisma.hashtag.findUnique({
    where: { name },
    include: {
      activities: {
        where: {
          activity: {
            visibility: ActivityVisibility.PUBLIC,
            status: ActivityStatus.APPROVED,
          },
        },
        include: {
          activity: {
            select: {
              id: true,
              title: true,
              type: true,
              distanceKm: true,
              durationMinutes: true,
              startedAt: true,
              user: { select: { id: true, name: true, nickname: true } },
            },
          },
        },
      },
      feedPosts: {
        include: {
          feedPost: {
            select: {
              id: true,
              content: true,
              createdAt: true,
              user: { select: { id: true, name: true, nickname: true } },
            },
          },
        },
      },
    },
  })
  return hashtag
}

export default async function HashtagPage({ params }: Props) {
  const { tag } = await params
  const decodedTag = decodeURIComponent(tag).toLowerCase()

  const hashtag = await getHashtagData(decodedTag)

  if (!hashtag) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <div className="mb-4 text-5xl font-black text-slate-600">#</div>
          <h1 className="text-2xl font-bold text-white mb-2">#{decodedTag}</h1>
          <p className="text-slate-400 mb-8">No content found for this hashtag yet.</p>
          <Link
            href="/app/hashtags"
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
          >
            Explore trending topics
          </Link>
        </div>
      </div>
    )
  }

  const activities = hashtag.activities
    .map((ah) => ah.activity)
    .filter(Boolean)

  const feedPosts = hashtag.feedPosts
    .map((fph) => fph.feedPost)
    .filter(Boolean)

  const totalCount = activities.length + feedPosts.length

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-green-600/20 text-green-400 text-2xl font-black">
            #
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">#{decodedTag}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {totalCount.toLocaleString()} {totalCount === 1 ? 'result' : 'results'}
              {' — '}
              {activities.length} {activities.length === 1 ? 'activity' : 'activities'},
              {' '}
              {feedPosts.length} {feedPosts.length === 1 ? 'post' : 'posts'}
            </p>
          </div>
        </div>

        {/* Activities */}
        {activities.length > 0 && (
          <section aria-labelledby="activities-heading">
            <h2
              id="activities-heading"
              className="mb-4 text-lg font-semibold text-white"
            >
              Activities
            </h2>
            <ul className="space-y-3">
              {activities.map((activity) => {
                if (!activity) return null
                return (
                  <li key={activity.id}>
                    <Link
                      href={`/app/activities/${activity.id}`}
                      className="group flex items-start gap-4 rounded-xl border border-slate-700 bg-slate-800 p-4 transition-colors hover:border-slate-600 hover:bg-slate-700/60"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-600/15 text-green-400 text-xl">
                        {activityTypeIcon(activity.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-100 group-hover:text-white">
                          {activity.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {activityTypeLabel(activity.type)}
                          {activity.distanceKm != null && (
                            <> &middot; {formatDistance(activity.distanceKm)}</>
                          )}
                          {activity.durationMinutes != null && (
                            <> &middot; {formatDuration(activity.durationMinutes)}</>
                          )}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          by{' '}
                          <span className="text-slate-300">
                            {activity.user.name}
                          </span>
                          {' '}
                          <span className="text-slate-500">@{activity.user.nickname}</span>
                          {' '}&middot;{' '}
                          {formatDate(activity.startedAt)}
                        </p>
                      </div>
                      <svg
                        className="mt-1 h-4 w-4 shrink-0 text-slate-600 group-hover:text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* Feed Posts */}
        {feedPosts.length > 0 && (
          <section aria-labelledby="posts-heading">
            <h2
              id="posts-heading"
              className="mb-4 text-lg font-semibold text-white"
            >
              Posts
            </h2>
            <ul className="space-y-3">
              {feedPosts.map((post) => {
                if (!post) return null
                return (
                  <li
                    key={post.id}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-600 text-xs font-bold text-slate-300">
                        {post.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-xs text-slate-400">
                        <span className="font-medium text-slate-300">{post.user.name}</span>
                        {' '}
                        <span>@{post.user.nickname}</span>
                        {' '}&middot;{' '}
                        {formatDate(post.createdAt)}
                      </div>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">{post.content}</p>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* No results */}
        {totalCount === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-700 bg-slate-800/40 px-6 py-16 text-center">
            <div className="text-4xl font-black text-slate-600">#</div>
            <div>
              <p className="font-semibold text-slate-200">No results yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Be the first to use #{decodedTag} in an activity or post.
              </p>
            </div>
            <Link
              href="/app/hashtags"
              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 transition-colors"
            >
              Explore trending topics
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
