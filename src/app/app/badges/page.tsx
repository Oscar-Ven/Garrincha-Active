import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getAllBadges, getUserBadges } from '@/services/badges'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Badges | Garrincha Active',
  description: 'Your earned badges and achievements',
}

const BADGE_ICONS: Record<string, string> = {
  first_activity:     '⚡',
  '5k_runner':        '🏃',
  '10k_runner':       '🏅',
  football_starter:   '⚽',
  match_player:       '🥅',
  weekly_streak:      '🔥',
  challenge_finisher: '🏆',
  center_champion:    '👑',
  reward_redeemer:    '🎁',
  segment_star:       '⭐',
  personal_record:    '💎',
  road_warrior:       '🚴',
}

export default async function BadgesPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const [allBadges, earned] = await Promise.all([
    getAllBadges(),
    getUserBadges(user.id),
  ])

  const earnedMap = new Map(earned.map((ub) => [ub.badgeId, ub.awardedAt]))
  const earnedCount = earned.length

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6 sm:px-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Badges</h1>
          <p className="mt-1 text-sm text-slate-400">
            {earnedCount} / {allBadges.length} earned
          </p>
        </div>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-yellow-500/20 text-3xl">
          🏆
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Collection progress</span>
          <span className="font-semibold text-yellow-400">{allBadges.length > 0 ? Math.round((earnedCount / allBadges.length) * 100) : 0}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
          <div
            className="h-full rounded-full bg-yellow-500 transition-all duration-700"
            style={{ width: `${allBadges.length > 0 ? (earnedCount / allBadges.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Earned */}
      {earnedCount > 0 && (
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Earned ({earnedCount})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {allBadges.filter((b) => earnedMap.has(b.id)).map((badge) => {
              const awardedAt = earnedMap.get(badge.id)!
              return (
                <div
                  key={badge.id}
                  className="flex items-center gap-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-yellow-500/20 text-3xl">
                    {badge.iconUrl
                      ? <img src={badge.iconUrl} alt={badge.name} className="h-10 w-10 object-contain" />
                      : (BADGE_ICONS[badge.key] ?? '🎖️')}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-yellow-300">{badge.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{badge.description}</p>
                    <p className="mt-1 text-xs text-yellow-500/70">Earned {formatDate(awardedAt)}</p>
                  </div>
                  <span className="ml-auto shrink-0 text-yellow-400">✓</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Locked */}
      {allBadges.some((b) => !earnedMap.has(b.id)) && (
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Locked ({allBadges.filter((b) => !earnedMap.has(b.id)).length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {allBadges.filter((b) => !earnedMap.has(b.id)).map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-4 rounded-xl border border-slate-700 bg-slate-800/60 p-4 opacity-60"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-700 text-3xl grayscale">
                  {BADGE_ICONS[badge.key] ?? '🎖️'}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-300">{badge.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{badge.description}</p>
                </div>
                <span className="ml-auto shrink-0 text-slate-600">🔒</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {allBadges.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/40 px-6 py-16 text-center">
          <div className="mb-3 text-4xl">🏆</div>
          <p className="font-semibold text-slate-200">No badges configured yet</p>
          <p className="mt-1 text-sm text-slate-500">Badges are set up by the platform admin.</p>
        </div>
      )}

    </div>
  )
}
