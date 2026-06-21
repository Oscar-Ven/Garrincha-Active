import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getAllBadges, getUserBadges } from '@/services/badges'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Achievements | GG',
  description: 'Your earned badges and achievements',
}

const BADGE_ICON_MAP: Record<string, string> = {
  first_activity:     'bolt',
  '5k_runner':        'directions_run',
  '10k_runner':       'directions_run',
  football_starter:   'sports_soccer',
  match_player:       'sports_kabaddi',
  weekly_streak:      'local_fire_department',
  challenge_finisher: 'emoji_events',
  center_champion:    'shield',
  reward_redeemer:    'redeem',
  segment_star:       'star',
  personal_record:    'diamond',
  road_warrior:       'directions_bike',
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
  const totalCount = allBadges.length
  const pct = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0

  return (
    <div className="max-w-xl mx-auto space-y-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-md font-black italic tracking-tight text-primary-fixed">Achievements</h1>
          <p className="text-label-caps text-on-surface-variant mt-xs">
            {earnedCount} / {totalCount} unlocked
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary-fixed/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary-fixed" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}>
            military_tech
          </span>
        </div>
      </div>

      {/* Collection progress */}
      <div className="glass-card rounded-xl p-md space-y-sm">
        <div className="flex justify-between">
          <span className="text-label-caps text-on-surface-variant">Collection progress</span>
          <span className="text-label-caps font-black text-primary-fixed">{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
          <div
            className="h-full rounded-full bg-primary-fixed transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between">
          <span className="text-label-caps text-on-surface-variant">{earnedCount} earned</span>
          <span className="text-label-caps text-on-surface-variant">{totalCount - earnedCount} locked</span>
        </div>
      </div>

      {/* Earned */}
      {earnedCount > 0 && (
        <section className="space-y-sm">
          <h2 className="text-label-caps text-on-surface-variant">Earned ({earnedCount})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
            {allBadges.filter((b) => earnedMap.has(b.id)).map((badge) => {
              const awardedAt = earnedMap.get(badge.id)!
              return (
                <div
                  key={badge.id}
                  className="glass-card rounded-xl p-md flex items-center gap-md border-l-4 border-l-primary-fixed"
                >
                  <div className="w-14 h-14 shrink-0 rounded-xl border-2 border-primary-fixed-dim bg-primary-fixed/10 flex items-center justify-center">
                    {badge.iconUrl ? (
                      <img src={badge.iconUrl} alt={badge.name} className="w-9 h-9 object-contain" />
                    ) : (
                      <span
                        className="material-symbols-outlined text-primary-fixed"
                        style={{ fontSize: '28px', fontVariationSettings: "'FILL' 1" }}
                      >
                        {BADGE_ICON_MAP[badge.key] ?? 'military_tech'}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-body-md font-bold text-primary-fixed truncate">{badge.name}</p>
                    <p className="text-label-caps text-on-surface-variant mt-xs">{badge.description}</p>
                    <p className="text-label-caps text-primary-fixed-dim mt-xs">
                      Earned {formatDate(awardedAt)}
                    </p>
                  </div>
                  <span
                    className="material-symbols-outlined text-primary-fixed shrink-0"
                    style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Locked */}
      {allBadges.some((b) => !earnedMap.has(b.id)) && (
        <section className="space-y-sm">
          <h2 className="text-label-caps text-on-surface-variant">
            Locked ({allBadges.filter((b) => !earnedMap.has(b.id)).length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
            {allBadges.filter((b) => !earnedMap.has(b.id)).map((badge) => (
              <div
                key={badge.id}
                className="glass-card rounded-xl p-md flex items-center gap-md opacity-50"
              >
                <div className="w-14 h-14 shrink-0 rounded-xl border-2 border-white/10 bg-surface-container-high flex items-center justify-center grayscale">
                  <span
                    className="material-symbols-outlined text-on-surface-variant"
                    style={{ fontSize: '28px', fontVariationSettings: "'FILL' 1" }}
                  >
                    {BADGE_ICON_MAP[badge.key] ?? 'military_tech'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-body-md font-bold text-on-surface truncate">{badge.name}</p>
                  <p className="text-label-caps text-on-surface-variant mt-xs">{badge.description}</p>
                </div>
                <span
                  className="material-symbols-outlined text-on-surface-variant shrink-0"
                  style={{ fontSize: '20px' }}
                >
                  lock
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* No badges configured */}
      {allBadges.length === 0 && (
        <div className="glass-card rounded-xl p-md py-12 flex flex-col items-center text-center border border-dashed border-white/10">
          <span className="material-symbols-outlined text-on-surface-variant mb-sm" style={{ fontSize: '40px' }}>military_tech</span>
          <p className="text-body-md font-bold text-on-surface">No badges configured yet</p>
          <p className="text-label-caps text-on-surface-variant mt-xs">Badges are set up by the platform admin.</p>
        </div>
      )}
    </div>
  )
}
