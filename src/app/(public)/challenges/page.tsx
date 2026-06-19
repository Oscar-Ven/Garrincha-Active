import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ChallengeType } from '@/generated/prisma'

export const metadata: Metadata = {
  title: 'Challenges',
  description:
    'Browse active challenges on Garrincha Active. Compete, earn points, and unlock badges by hitting distance, training, and match targets.',
}

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getActiveChallenges() {
  const now = new Date()
  return prisma.challenge.findMany({
    where: {
      isActive: true,
      endDate: { gte: now },
    },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      startDate: true,
      endDate: true,
      targetValue: true,
      pointsReward: true,
      imageUrl: true,
      badge: {
        select: { name: true, iconUrl: true },
      },
      sponsor: {
        select: { name: true, logoUrl: true },
      },
      center: {
        select: { name: true },
      },
      _count: {
        select: { participants: true },
      },
    },
    orderBy: { endDate: 'asc' },
  })
}

type Challenge = Awaited<ReturnType<typeof getActiveChallenges>>[number]

// ─── Constants ────────────────────────────────────────────────────────────────

const CHALLENGE_TYPE_LABELS: Record<ChallengeType, string> = {
  DISTANCE: 'Distance',
  ACTIVE_MINUTES: 'Active Minutes',
  ACTIVITY_COUNT: 'Activity Count',
  FOOTBALL_TRAINING_ATTENDANCE: 'Training Attendance',
  MATCH_COUNT: 'Match Count',
  POINTS: 'Points',
  CENTER_VS_CENTER: 'Center vs Center',
  TEAM: 'Team',
  STREAK: 'Streak',
  SEGMENT_EFFORTS: 'Segment Efforts',
}

const CHALLENGE_TYPE_UNITS: Record<ChallengeType, string> = {
  DISTANCE: 'km',
  ACTIVE_MINUTES: 'min',
  ACTIVITY_COUNT: 'activities',
  FOOTBALL_TRAINING_ATTENDANCE: 'sessions',
  MATCH_COUNT: 'matches',
  POINTS: 'pts',
  CENTER_VS_CENTER: 'pts',
  TEAM: 'pts',
  STREAK: 'days',
  SEGMENT_EFFORTS: 'segments',
}

const STREAK_ICON = (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
)

const CHALLENGE_TYPE_ICONS: Record<ChallengeType, React.ReactNode> = {
  DISTANCE: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  ACTIVE_MINUTES: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  ACTIVITY_COUNT: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  FOOTBALL_TRAINING_ATTENDANCE: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2 2" />
    </svg>
  ),
  MATCH_COUNT: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  POINTS: (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  CENTER_VS_CENTER: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5.356-3.712M9 20H4v-2a4 4 0 015.356-3.712M15 7a4 4 0 11-8 0 4 4 0 018 0zm6 3a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  TEAM: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5.356-3.712M9 20H4v-2a4 4 0 015.356-3.712M15 7a4 4 0 11-8 0 4 4 0 018 0zm6 3a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  STREAK: STREAK_ICON,
  SEGMENT_EFFORTS: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
    </svg>
  ),
}

function challengeTypeBadgeVariant(type: ChallengeType): 'default' | 'secondary' | 'gold' | 'outline' {
  switch (type) {
    case 'CENTER_VS_CENTER':
    case 'TEAM':
      return 'gold'
    case 'FOOTBALL_TRAINING_ATTENDANCE':
    case 'MATCH_COUNT':
      return 'default'
    case 'DISTANCE':
    case 'ACTIVE_MINUTES':
      return 'secondary'
    default:
      return 'outline'
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysLeft(endDate: Date): number {
  const now = new Date()
  return Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function formatEndLabel(end: Date): { label: string; urgent: boolean } {
  const days = daysLeft(end)
  if (days <= 0) return { label: 'Ends today', urgent: true }
  if (days === 1) return { label: '1 day left', urgent: true }
  if (days <= 5) return { label: `${days} days left`, urgent: true }
  return {
    label: end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    urgent: false,
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const end = new Date(challenge.endDate)
  const { label: endLabel, urgent } = formatEndLabel(end)
  const unit = CHALLENGE_TYPE_UNITS[challenge.type]
  const participantCount = challenge._count.participants

  return (
    <article className="group flex flex-col rounded-2xl border border-slate-700 bg-slate-800 shadow-sm transition-all duration-200 hover:border-green-600/60 hover:shadow-green-900/20 hover:shadow-md overflow-hidden">
      {/* Image strip */}
      {challenge.imageUrl ? (
        <div className="relative h-36 w-full overflow-hidden bg-slate-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={challenge.imageUrl}
            alt={challenge.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-slate-900/70 to-transparent" />
        </div>
      ) : (
        <div className="relative flex h-36 w-full items-center justify-center overflow-hidden bg-linear-to-br from-slate-700 to-slate-800">
          <svg
            className="h-16 w-16 text-slate-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5 gap-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-semibold leading-snug text-slate-100 line-clamp-2 flex-1">
            {challenge.title}
          </h2>
          <Badge
            variant={challengeTypeBadgeVariant(challenge.type)}
            className="shrink-0 ml-1 flex items-center gap-1"
          >
            {CHALLENGE_TYPE_ICONS[challenge.type]}
            <span>{CHALLENGE_TYPE_LABELS[challenge.type]}</span>
          </Badge>
        </div>

        {/* Description */}
        {challenge.description && (
          <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
            {challenge.description}
          </p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
          {/* End date */}
          <span className={cn('flex items-center gap-1', urgent && 'text-amber-400 font-medium')}>
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {endLabel}
          </span>

          {/* Participants */}
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5.356-3.712M9 20H4v-2a4 4 0 015.356-3.712M15 7a4 4 0 11-8 0 4 4 0 018 0zm6 3a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {participantCount > 0
              ? `${participantCount.toLocaleString()} joined`
              : 'Be the first'}
          </span>

          {/* Center */}
          {challenge.center && (
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {challenge.center.name}
            </span>
          )}
        </div>

        {/* Rewards row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Points */}
          <div className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-yellow-500 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="text-sm font-semibold text-yellow-400">{challenge.pointsReward.toLocaleString()} pts</span>
          </div>

          {/* Target */}
          <span className="text-xs text-slate-500">
            Target:{' '}
            <span className="font-medium text-slate-300">
              {challenge.targetValue.toLocaleString()} {unit}
            </span>
          </span>

          {/* Badge reward */}
          {challenge.badge && (
            <div className="flex items-center gap-1 rounded-full border border-yellow-600/40 bg-yellow-600/10 px-2 py-0.5 text-xs text-yellow-400">
              <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28z" />
              </svg>
              {challenge.badge.name} badge
            </div>
          )}

          {/* Sponsor */}
          {challenge.sponsor && (
            <span className="text-xs text-slate-500">
              by <span className="text-slate-300">{challenge.sponsor.name}</span>
            </span>
          )}
        </div>

        {/* CTA */}
        <div className="mt-auto pt-1">
          <Link
            href={`/register`}
            className="block w-full rounded-lg bg-green-600 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-green-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
          >
            Join Challenge
          </Link>
        </div>
      </div>
    </article>
  )
}

function StatBubble({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl border border-slate-700 bg-slate-800/60 px-6 py-4 text-center">
      <span className="text-3xl font-bold text-white">{value}</span>
      <span className="text-sm text-slate-400">{label}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ChallengesPage() {
  const challenges = await getActiveChallenges()

  const totalParticipants = challenges.reduce((sum, c) => sum + c._count.participants, 0)
  const totalPointsOnOffer = challenges.reduce((sum, c) => sum + c.pointsReward, 0)

  // Group by type for summary stats
  const typeSet = new Set(challenges.map((c) => c.type))

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-slate-900">
        {/* Background decoration */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-1/2 h-125 w-225 -translate-x-1/2 rounded-full bg-green-600/5 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-64 w-64 rounded-full bg-yellow-600/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {/* Eyebrow label */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-green-600/30 bg-green-600/10 px-4 py-1.5 text-sm font-medium text-green-400">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Active Challenges
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Push Your Limits,{' '}
              <span className="text-green-400">Earn Rewards</span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-400">
              Compete in distance runs, football training streaks, match challenges, and more.
              Complete challenges to earn points, unlock badges, and climb the leaderboard.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className="rounded-xl bg-green-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-green-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                Create Free Account
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-white/20 px-6 py-3 text-base font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                Sign In to Join
              </Link>
            </div>
          </div>

          {/* Stats */}
          {challenges.length > 0 && (
            <div className="mx-auto mt-14 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-3">
              <StatBubble value={challenges.length.toString()} label="Active Challenges" />
              <StatBubble
                value={totalParticipants > 0 ? totalParticipants.toLocaleString() : '—'}
                label="Participants"
              />
              <StatBubble
                value={`${totalPointsOnOffer.toLocaleString()} pts`}
                label="Points on Offer"
              />
            </div>
          )}
        </div>
      </section>

      {/* ── Challenges Grid ── */}
      <section className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        {challenges.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-700 bg-slate-800/50 px-6 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700">
              <svg
                className="h-8 w-8 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-200">No active challenges right now</p>
              <p className="mt-1 text-sm text-slate-400">
                New challenges are added regularly. Create an account to get notified when the next
                one drops.
              </p>
            </div>
            <Link
              href="/register"
              className="mt-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-500"
            >
              Get Notified — Join Free
            </Link>
          </div>
        ) : (
          <>
            {/* Filter hint / type legend */}
            <div className="mb-8 flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-400 mr-1">Challenge types:</span>
              {Array.from(typeSet).map((type) => (
                <Badge
                  key={type}
                  variant={challengeTypeBadgeVariant(type)}
                  className="flex items-center gap-1 cursor-default"
                >
                  {CHALLENGE_TYPE_ICONS[type]}
                  <span>{CHALLENGE_TYPE_LABELS[type]}</span>
                </Badge>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {challenges.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── CTA Banner ── */}
      <section className="border-t border-slate-700/60 bg-linear-to-br from-slate-800 via-slate-900 to-slate-800">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-green-600/20 bg-green-600/5 px-8 py-12 text-center sm:px-12">
            {/* Decoration */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-green-600/10 blur-3xl" />
              <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-yellow-600/10 blur-3xl" />
            </div>

            <div className="relative">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-600/20">
                <svg
                  className="h-7 w-7 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                Ready to compete?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base text-slate-400">
                Join thousands of players tracking workouts, completing challenges, and earning
                rewards. Your first challenge is waiting.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-green-900/30 transition-colors hover:bg-green-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Join Free — Start Today
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-7 py-3.5 text-base font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                >
                  Already a member? Sign In
                </Link>
              </div>

              {/* Trust signals */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Free to join
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Real rewards
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  No credit card required
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
