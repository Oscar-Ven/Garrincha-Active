import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { FeedPostWithRelations } from '@/types'
import type { ActivityType } from '@/generated/prisma'

function ago(date: Date | string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function sportIcon(type: ActivityType): string {
  const map: Partial<Record<string, string>> = {
    TENNIS: 'sports_tennis',
    PADEL: 'sports_tennis',
    SQUASH: 'sports_handball',
    BADMINTON: 'sports_handball',
    PICKLEBALL: 'sports_tennis',
    RACQUETBALL: 'sports_handball',
    RUN: 'directions_run',
    WALK: 'directions_walk',
    CYCLING: 'directions_bike',
    FITNESS: 'fitness_center',
  }
  return map[type as string] ?? 'sports'
}

function Avatar({
  name,
  border = 'primary',
  size = 'md',
}: {
  name: string
  border?: 'primary' | 'secondary'
  size?: 'md' | 'lg'
}) {
  return (
    <div
      className={cn(
        'rounded-full border-2 bg-surface-container-high flex items-center justify-center font-bold text-white shrink-0 select-none',
        size === 'lg' ? 'w-14 h-14 text-base' : 'w-10 h-10 text-sm',
        border === 'secondary' ? 'border-secondary' : 'border-primary-fixed',
      )}
    >
      {initials(name)}
    </div>
  )
}

export default function StitchFeedCard({ post }: { post: FeedPostWithRelations }) {
  const { type, user, content, createdAt, activity, userBadge, challengeParticipant } = post
  const timeAgo = ago(createdAt)

  if (type === 'MATCH_RESULT') {
    return (
      <div className="glass-card rounded-xl p-md border-l-4 border-primary-fixed">
        <div className="flex items-center gap-2 mb-sm">
          <span
            className="material-symbols-outlined text-primary-fixed"
            style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
          >
            emoji_events
          </span>
          <span className="text-label-caps text-on-surface-variant">Match Result · {timeAgo}</span>
        </div>
        <div className="flex items-center gap-sm">
          <Avatar name={user.name} />
          <div className="flex-1 min-w-0">
            <p className="text-body-md font-bold text-white truncate">{user.name}</p>
            {content && (
              <p className="text-body-md text-on-surface-variant text-sm mt-xs">{content}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (type === 'BADGE' && userBadge) {
    return (
      <div className="glass-card rounded-xl p-md border-l-4 border-secondary">
        <div className="flex items-center gap-2 mb-sm">
          <span
            className="material-symbols-outlined text-secondary"
            style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
          >
            military_tech
          </span>
          <span className="text-label-caps text-on-surface-variant">Badge Earned · {timeAgo}</span>
        </div>
        <div className="flex items-center gap-sm">
          <Avatar name={user.name} border="secondary" />
          <p className="text-body-md text-on-surface flex-1">
            <span className="font-bold text-white">{user.name}</span> earned{' '}
            <span className="text-secondary font-bold">{userBadge.badge.name}</span>
          </p>
        </div>
      </div>
    )
  }

  if (type === 'CHALLENGE_COMPLETION' && challengeParticipant) {
    return (
      <div className="glass-card rounded-xl p-md border-l-4 border-primary-fixed">
        <div className="flex items-center gap-2 mb-sm">
          <span
            className="material-symbols-outlined text-primary-fixed"
            style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
          >
            workspace_premium
          </span>
          <span className="text-label-caps text-on-surface-variant">
            Challenge Complete · {timeAgo}
          </span>
        </div>
        <div className="flex items-center gap-sm">
          <Avatar name={user.name} />
          <div className="flex-1 min-w-0">
            <p className="text-body-md text-on-surface">
              <span className="font-bold text-white">{user.name}</span> completed{' '}
              <span className="font-bold text-primary-fixed">
                {challengeParticipant.challenge.title}
              </span>
            </p>
            <p className="text-label-caps text-on-surface-variant mt-xs">
              +{challengeParticipant.challenge.pointsReward} pts
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'PERSONAL_RECORD') {
    return (
      <div className="glass-card rounded-xl p-md border-l-4 border-secondary">
        <div className="flex items-center gap-md">
          <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-secondary"
              style={{ fontSize: '20px' }}
            >
              trending_up
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-body-md text-on-surface">
              <span className="font-bold text-white">{user.name}</span>{' '}
              {content ?? 'set a new personal record'}
            </p>
            <p className="text-label-caps text-on-surface-variant mt-xs">{timeAgo}</p>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'TEAM_JOIN') {
    return (
      <div className="glass-card rounded-xl p-md flex items-center gap-md">
        <Avatar name={user.name} border="secondary" size="lg" />
        <div className="flex-1 min-w-0">
          <p className="text-body-md text-on-surface">
            <span className="font-bold text-white">{user.name}</span> joined a team.
          </p>
          <p className="text-label-caps text-on-surface-variant mt-xs">{timeAgo}</p>
        </div>
      </div>
    )
  }

  // ACTIVITY, EVENT_REGISTRATION, REWARD_REDEMPTION, CUSTOM
  return (
    <div className="glass-card rounded-xl p-md">
      <div className="flex items-center gap-sm mb-sm">
        <Avatar name={user.name} />
        <div className="min-w-0 flex-1">
          <p className="text-body-md font-bold text-white truncate">{user.name}</p>
          <p className="text-label-caps text-on-surface-variant">{timeAgo}</p>
        </div>
        {activity && (
          <span
            className="material-symbols-outlined text-primary-fixed-dim shrink-0"
            style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
          >
            {sportIcon(activity.type)}
          </span>
        )}
      </div>
      {(content || activity) && (
        <div>
          {content && <p className="text-body-md text-on-surface">{content}</p>}
          {activity && (
            <p className="text-label-caps text-on-surface-variant mt-xs">
              {activity.title} · {activity.durationMinutes}min · +{activity.pointsEarned} pts
            </p>
          )}
        </div>
      )}
    </div>
  )
}
