import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { getChallenges } from '@/services/challenges'
import { ChallengeCard } from '@/components/player/challenge-card'
import { ChallengesControls } from './challenges-controls'
import { ChallengeType } from '@/generated/prisma'

export const metadata: Metadata = {
  title: 'Challenges | Garrincha Active',
  description: 'Browse and join challenges. Track your progress, earn points, and unlock badges.',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTab(raw: string | undefined): 'available' | 'mine' {
  return raw === 'mine' ? 'mine' : 'available'
}

function parseType(raw: string | undefined): ChallengeType | 'ALL' {
  if (!raw || raw === 'ALL') return 'ALL'
  if (Object.values(ChallengeType).includes(raw as ChallengeType)) {
    return raw as ChallengeType
  }
  return 'ALL'
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: 'available' | 'mine' }) {
  const symbol = tab === 'mine' ? 'workspace_premium' : 'emoji_events'
  const title = tab === 'mine' ? 'No challenges joined yet' : 'No active challenges found'
  const body = tab === 'mine'
    ? 'Head over to the Available tab to find challenges that match your goals.'
    : 'Try clearing the type filter or check back soon for new challenges.'

  return (
    <div className="flex flex-col items-center justify-center gap-md glass-card rounded-xl border-dashed px-md py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-highest">
        <span
          className="material-symbols-outlined text-on-surface-variant"
          style={{ fontSize: '28px', fontVariationSettings: "'FILL' 1" }}
        >
          {symbol}
        </span>
      </div>
      <div>
        <p className="text-body-md font-bold text-on-surface">{title}</p>
        <p className="mt-xs text-label-caps text-on-surface-variant">{body}</p>
      </div>
    </div>
  )
}

// ─── Summary Stats ─────────────────────────────────────────────────────────────

function SummaryStats({
  totalAvailable,
  totalJoined,
  completedCount,
}: {
  totalAvailable: number
  totalJoined: number
  completedCount: number
}) {
  return (
    <div className="grid grid-cols-3 gap-sm glass-card rounded-xl p-md">
      <div className="flex flex-col items-center gap-0.5 text-center">
        <span className="text-stats-xl font-bold text-on-surface">{totalAvailable}</span>
        <span className="text-label-caps text-on-surface-variant">Active Challenges</span>
      </div>
      <div className="flex flex-col items-center gap-0.5 text-center border-x border-white/10">
        <span className="text-stats-xl font-bold text-primary-fixed">{totalJoined}</span>
        <span className="text-label-caps text-on-surface-variant">Joined</span>
      </div>
      <div className="flex flex-col items-center gap-0.5 text-center">
        <span className="text-stats-xl font-bold text-[#FFD700]">{completedCount}</span>
        <span className="text-label-caps text-on-surface-variant">Completed</span>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface ChallengesPageProps {
  searchParams: Promise<{ tab?: string; type?: string }>
}

export default async function ChallengesPage({ searchParams }: ChallengesPageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const resolvedParams = await searchParams
  const activeTab = parseTab(resolvedParams.tab)
  const activeType = parseType(resolvedParams.type)

  const allActiveChallenges = await getChallenges({
    activeOnly: true,
    userId: user.id,
    ...(activeType !== 'ALL' ? { type: activeType } : {}),
  })

  const allJoinedChallenges = await getChallenges({
    userId: user.id,
    ...(activeType !== 'ALL' ? { type: activeType } : {}),
  }).then((cs) => cs.filter((c) => c.userParticipant != null))

  const allChallengesUnfiltered = await getChallenges({
    activeOnly: true,
    userId: user.id,
  })
  const totalJoinedUnfiltered = allChallengesUnfiltered.filter(
    (c) => c.userParticipant != null,
  ).length
  const completedCount = allChallengesUnfiltered.filter(
    (c) => c.userParticipant?.isCompleted === true,
  ).length

  const displayedChallenges =
    activeTab === 'available' ? allActiveChallenges : allJoinedChallenges

  return (
    <div className="space-y-lg">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-md">
        <div>
          <h1 className="text-headline-md font-black italic tracking-tight text-primary-fixed">
            Challenges
          </h1>
          <p className="mt-xs text-label-caps text-on-surface-variant">
            Compete, earn points, and unlock badges by hitting your targets.
          </p>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <SummaryStats
        totalAvailable={allChallengesUnfiltered.length}
        totalJoined={totalJoinedUnfiltered}
        completedCount={completedCount}
      />

      {/* ── Controls (tabs + type filter) ── */}
      <Suspense fallback={null}>
        <ChallengesControls
          activeTab={activeTab}
          activeType={activeType}
          availableCount={
            activeType === 'ALL'
              ? allChallengesUnfiltered.length
              : allActiveChallenges.length
          }
          myCount={
            activeType === 'ALL'
              ? totalJoinedUnfiltered
              : allJoinedChallenges.length
          }
        />
      </Suspense>

      {/* ── Challenge Grid ── */}
      {displayedChallenges.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
          {displayedChallenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              userProgress={challenge.userParticipant?.progress ?? 0}
              isJoined={challenge.userParticipant != null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
