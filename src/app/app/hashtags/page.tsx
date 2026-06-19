import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Trending Topics',
  description: 'Browse the most popular hashtags on Garrincha Active.',
}

async function getTrendingHashtags() {
  return prisma.hashtag.findMany({
    orderBy: {
      activities: { _count: 'desc' },
    },
    take: 20,
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          activities: true,
          feedPosts: true,
        },
      },
    },
  })
}

// Scale font size by relative usage for a tag-cloud feel
function getPillSize(count: number, max: number): string {
  if (max === 0) return 'text-sm'
  const ratio = count / max
  if (ratio >= 0.75) return 'text-xl font-bold'
  if (ratio >= 0.5) return 'text-lg font-semibold'
  if (ratio >= 0.25) return 'text-base font-medium'
  return 'text-sm font-normal'
}

const pillColors = [
  'bg-green-600/15 text-green-400 ring-green-600/20 hover:bg-green-600/25',
  'bg-blue-600/15 text-blue-400 ring-blue-600/20 hover:bg-blue-600/25',
  'bg-purple-600/15 text-purple-400 ring-purple-600/20 hover:bg-purple-600/25',
  'bg-yellow-600/15 text-yellow-400 ring-yellow-600/20 hover:bg-yellow-600/25',
  'bg-orange-600/15 text-orange-400 ring-orange-600/20 hover:bg-orange-600/25',
  'bg-cyan-600/15 text-cyan-400 ring-cyan-600/20 hover:bg-cyan-600/25',
  'bg-pink-600/15 text-pink-400 ring-pink-600/20 hover:bg-pink-600/25',
  'bg-rose-600/15 text-rose-400 ring-rose-600/20 hover:bg-rose-600/25',
]

function pillColor(index: number): string {
  return pillColors[index % pillColors.length]
}

export default async function TrendingHashtagsPage() {
  const hashtags = await getTrendingHashtags()

  const maxCount = hashtags.reduce(
    (max, h) => Math.max(max, h._count.activities + h._count.feedPosts),
    0,
  )

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Trending Topics</h1>
          <p className="mt-1 text-sm text-slate-400">
            Popular hashtags used by the Garrincha Active community.
          </p>
        </div>

        {hashtags.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-700 bg-slate-800/40 px-6 py-16 text-center">
            <div className="text-5xl font-black text-slate-600">#</div>
            <div>
              <p className="font-semibold text-slate-200">No hashtags yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Add hashtags to your activities and posts to see them trending here.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Tag cloud */}
            <div className="flex flex-wrap gap-3">
              {hashtags.map((tag, i) => {
                const total = tag._count.activities + tag._count.feedPosts
                return (
                  <Link
                    key={tag.id}
                    href={`/app/hashtags/${tag.name}`}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-4 py-2 ring-1 transition-colors',
                      getPillSize(total, maxCount),
                      pillColor(i),
                    )}
                  >
                    <span className="opacity-60">#</span>
                    {tag.name}
                    <span className="ml-1 text-xs opacity-60">
                      {total.toLocaleString()}
                    </span>
                  </Link>
                )
              })}
            </div>

            {/* List view */}
            <section aria-labelledby="list-heading">
              <h2
                id="list-heading"
                className="mb-4 text-lg font-semibold text-white"
              >
                All Topics
              </h2>
              <ul className="divide-y divide-slate-700/60 rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
                {hashtags.map((tag, i) => {
                  const total = tag._count.activities + tag._count.feedPosts
                  return (
                    <li key={tag.id}>
                      <Link
                        href={`/app/hashtags/${tag.name}`}
                        className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-700/40 group"
                      >
                        <span className="text-slate-500 text-xs w-5 tabular-nums text-right shrink-0">
                          {i + 1}
                        </span>
                        <span className="flex-1 font-semibold text-slate-100 group-hover:text-white">
                          #{tag.name}
                        </span>
                        <div className="text-right text-xs text-slate-500 shrink-0">
                          <span className="text-slate-300 font-medium">
                            {tag._count.activities.toLocaleString()}
                          </span>{' '}
                          {tag._count.activities === 1 ? 'activity' : 'activities'}
                          {tag._count.feedPosts > 0 && (
                            <>,{' '}
                              <span className="text-slate-300 font-medium">
                                {tag._count.feedPosts.toLocaleString()}
                              </span>{' '}
                              {tag._count.feedPosts === 1 ? 'post' : 'posts'}
                            </>
                          )}
                        </div>
                        <svg
                          className="h-4 w-4 shrink-0 text-slate-600 group-hover:text-slate-400"
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
          </>
        )}

      </div>
    </div>
  )
}
