'use client'

import { useState, useTransition, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  Heart,
  MessageCircle,
  Activity,
  Award,
  Trophy,
  Gift,
  Zap,
  Users,
  Star,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ActivityType, FeedPostType } from '@/generated/prisma'
import { toggleKudos, addComment } from '@/app/app/feed/actions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedPostUser {
  id: string
  name: string
  nickname: string
  avatarUrl?: string | null
}

interface FeedPostActivity {
  id: string
  title: string
  type: ActivityType
  distanceKm?: number | null
  durationMinutes: number
}

interface FeedPostUserBadge {
  badge: { name: string; description: string; iconUrl?: string | null }
}

interface FeedPostChallenge {
  challenge: { title: string }
}

interface FeedPostRewardRedemption {
  reward: { title: string }
}

interface PostComment {
  id: string
  userId: string
  content: string
  createdAt: Date | string
  user: { id: string; name: string; nickname: string; avatarUrl?: string | null }
}

interface PostReaction {
  userId: string
  type: string
}

export interface FeedPostCardProps {
  post: {
    id: string
    type: FeedPostType
    content?: string | null
    user: FeedPostUser
    activity?: FeedPostActivity | null
    userBadge?: FeedPostUserBadge | null
    challengeParticipant?: FeedPostChallenge | null
    rewardRedemption?: FeedPostRewardRedemption | null
    createdAt: Date | string
    comments?: PostComment[]
    reactions?: PostReaction[]
    _count: { reactions: number; comments: number }
  }
  currentUserId?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  RUN: 'Run', WALK: 'Walk', CYCLING: 'Cycling',
  FOOTBALL_TRAINING: 'Football Training', FOOTBALL_MATCH: 'Football Match',
  FITNESS: 'Fitness', CUSTOM: 'Activity',
  PADEL: 'Padel', TENNIS: 'Tennis', SQUASH: 'Squash',
  PICKLEBALL: 'Pickleball', BADMINTON: 'Badminton', RACQUETBALL: 'Racquetball',
}

const POST_TYPE_META: Record<FeedPostType, { label: string; icon: React.ElementType; badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive' | 'gold' }> = {
  ACTIVITY: { label: 'Activity', icon: Activity, badgeVariant: 'default' },
  BADGE: { label: 'Badge Earned', icon: Award, badgeVariant: 'gold' },
  CHALLENGE_COMPLETION: { label: 'Challenge', icon: Trophy, badgeVariant: 'gold' },
  REWARD_REDEMPTION: { label: 'Reward', icon: Gift, badgeVariant: 'secondary' },
  EVENT_REGISTRATION: { label: 'Event', icon: Star, badgeVariant: 'secondary' },
  TEAM_JOIN: { label: 'Team', icon: Users, badgeVariant: 'secondary' },
  PERSONAL_RECORD: { label: 'Personal Record', icon: Trophy, badgeVariant: 'gold' },
  CUSTOM: { label: 'Post', icon: Zap, badgeVariant: 'outline' },
}

function getInitials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

function formatDistance(km: number): string {
  return km >= 1 ? `${km.toFixed(2)} km` : `${(km * 1000).toFixed(0)} m`
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// ─── Post Body by Type ────────────────────────────────────────────────────────

function ActivityBody({ activity }: { activity: FeedPostActivity }) {
  return (
    <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-sm font-medium text-slate-800">{activity.title}</p>
      <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Activity className="h-3.5 w-3.5 text-green-600" />
          {ACTIVITY_TYPE_LABELS[activity.type]}
        </span>
        {activity.distanceKm != null && activity.distanceKm > 0 && (
          <span>{formatDistance(activity.distanceKm)}</span>
        )}
        <span>{formatDuration(activity.durationMinutes)}</span>
      </div>
    </div>
  )
}

function BadgeBody({ userBadge }: { userBadge: FeedPostUserBadge }) {
  return (
    <div className="mt-2 flex items-center gap-3 rounded-lg border border-yellow-100 bg-yellow-50 px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-100">
        {userBadge.badge.iconUrl
          ? <img src={userBadge.badge.iconUrl} alt={userBadge.badge.name} className="h-8 w-8 object-contain" />
          : <Award className="h-5 w-5 text-yellow-600" />}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">{userBadge.badge.name}</p>
        <p className="truncate text-xs text-slate-500">{userBadge.badge.description}</p>
      </div>
    </div>
  )
}

function ChallengeBody({ challengeParticipant }: { challengeParticipant: FeedPostChallenge }) {
  return (
    <div className="mt-2 flex items-center gap-3 rounded-lg border border-green-100 bg-green-50 px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
        <Trophy className="h-5 w-5 text-green-600" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-green-700">Challenge Completed</p>
        <p className="text-sm font-semibold text-slate-800">{challengeParticipant.challenge.title}</p>
      </div>
    </div>
  )
}

function RewardBody({ rewardRedemption }: { rewardRedemption: FeedPostRewardRedemption }) {
  return (
    <div className="mt-2 flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
        <Gift className="h-5 w-5 text-slate-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Reward Redeemed</p>
        <p className="text-sm font-semibold text-slate-800">{rewardRedemption.reward.title}</p>
      </div>
    </div>
  )
}

// ─── Comments Section ─────────────────────────────────────────────────────────

function CommentsSection({
  postId,
  comments,
  currentUserId,
}: {
  postId: string
  comments: PostComment[]
  currentUserId?: string
}) {
  const [text, setText] = useState('')
  const [localComments, setLocalComments] = useState(comments)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || !currentUserId) return

    // Optimistic update
    const optimistic: PostComment = {
      id: `opt-${Date.now()}`,
      userId: currentUserId,
      content: trimmed,
      createdAt: new Date(),
      user: { id: currentUserId, name: 'You', nickname: 'you', avatarUrl: null },
    }
    setLocalComments((prev) => [...prev, optimistic])
    setText('')

    startTransition(async () => {
      await addComment(postId, trimmed)
    })
  }

  return (
    <div className="border-t border-slate-100 px-4 py-3 space-y-3">
      {localComments.map((c) => (
        <div key={c.id} className="flex gap-2 text-sm">
          <span className="font-semibold text-slate-800 shrink-0">{c.user.name}</span>
          <span className="text-slate-600">{c.content}</span>
        </div>
      ))}
      {currentUserId && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            maxLength={500}
            className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-green-500"
            disabled={isPending}
          />
          <button
            type="submit"
            disabled={!text.trim() || isPending}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-white disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FeedPostCard({ post, currentUserId }: FeedPostCardProps) {
  const initiallyLiked = post.reactions?.some((r) => r.userId === currentUserId) ?? false
  const [kudosCount, setKudosCount] = useState(post._count.reactions)
  const [hasKudos, setHasKudos] = useState(initiallyLiked)
  const [showComments, setShowComments] = useState(false)
  const [isPending, startTransition] = useTransition()

  const meta = POST_TYPE_META[post.type] ?? POST_TYPE_META.CUSTOM
  const TypeIcon = meta.icon
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })

  function handleKudos() {
    if (!currentUserId) return
    const next = !hasKudos
    setHasKudos(next)
    setKudosCount((prev) => prev + (next ? 1 : -1))
    startTransition(async () => {
      await toggleKudos(post.id)
    })
  }

  return (
    <article className="group rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar size="md" className="shrink-0">
            {post.user.avatarUrl && <AvatarImage src={post.user.avatarUrl} alt={post.user.name} />}
            <AvatarFallback>{getInitials(post.user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{post.user.name}</p>
            <p className="truncate text-xs text-slate-500">@{post.user.nickname}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge variant={meta.badgeVariant} className="flex items-center gap-1">
            <TypeIcon className="h-3 w-3" />
            {meta.label}
          </Badge>
          <time className="text-xs text-slate-400" dateTime={new Date(post.createdAt).toISOString()}>
            {timeAgo}
          </time>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3 pt-3">
        {post.content && <p className="text-sm leading-relaxed text-slate-700">{post.content}</p>}
        {post.type === 'ACTIVITY' && post.activity && <ActivityBody activity={post.activity} />}
        {post.type === 'BADGE' && post.userBadge && <BadgeBody userBadge={post.userBadge} />}
        {post.type === 'CHALLENGE_COMPLETION' && post.challengeParticipant && <ChallengeBody challengeParticipant={post.challengeParticipant} />}
        {post.type === 'REWARD_REDEMPTION' && post.rewardRedemption && <RewardBody rewardRedemption={post.rewardRedemption} />}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-1 border-t border-slate-100 px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleKudos}
          disabled={isPending || !currentUserId}
          aria-label={hasKudos ? 'Remove kudos' : 'Give kudos'}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            hasKudos
              ? 'text-rose-500 hover:bg-rose-50 hover:text-rose-600'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
          )}
        >
          <Heart className={cn('h-4 w-4 transition-all', hasKudos && 'fill-rose-500 stroke-rose-500')} />
          <span>{kudosCount > 0 ? kudosCount : ''} Kudos</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <MessageCircle className="h-4 w-4" />
          <span>
            {post._count.comments > 0
              ? `${post._count.comments} Comment${post._count.comments === 1 ? '' : 's'}`
              : 'Comment'}
          </span>
          {showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>

      {/* Comments */}
      {showComments && (
        <CommentsSection
          postId={post.id}
          comments={post.comments ?? []}
          currentUserId={currentUserId}
        />
      )}
    </article>
  )
}
