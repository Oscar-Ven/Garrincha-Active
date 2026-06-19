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
  if (tab === 'mine') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-700 bg-slate-800/40 px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-700">
          <svg
            className="h-7 w-7 text-slate-500"
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
          <p className="text-base font-semibold text-slate-200">No challenges joined yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Head over to the Available tab to find challenges that match your goals.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-700 bg-slate-800/40 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-700">
        <svg
          className="h-7 w-7 text-slate-500"
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
        <p className="text-base font-semibold text-slate-200">No active challenges found</p>
        <p className="mt-1 text-sm text-slate-400">
          Try clearing the type filter or check back soon for new challenges.
        </p>
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
    <div className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4">
      <div className="flex flex-col items-center gap-0.5 text-center">
        <span className="text-2xl font-bold text-white">{totalAvailable}</span>
        <span className="text-xs text-slate-400">Active Challenges</span>
      </div>
      <div className="flex flex-col items-center gap-0.5 text-center border-x border-slate-700">
        <span className="text-2xl font-bold text-green-400">{totalJoined}</span>
        <span className="text-xs text-slate-400">Joined</span>
      </div>
      <div className="flex flex-col items-center gap-0.5 text-center">
        <span className="text-2xl font-bold text-yellow-400">{completedCount}</span>
        <span className="text-xs text-slate-400">Completed</span>
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

  // Load all active challenges with user participation data in a single query
  const allActiveChallenges = await getChallenges({
    activeOnly: true,
    userId: user.id,
    ...(activeType !== 'ALL' ? { type: activeType } : {}),
  })

  // Load user's joined challenges (may include ended ones)
  const allJoinedChallenges = await getChallenges({
    userId: user.id,
    ...(activeType !== 'ALL' ? { type: activeType } : {}),
  }).then((cs) => cs.filter((c) => c.userParticipant != null))

  // For summary stats, get unfiltered counts
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

  // Determine which list to show based on active tab
  const displayedChallenges =
    activeTab === 'available' ? allActiveChallenges : allJoinedChallenges

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Challenges
          </h1>
          <p className="mt-1 text-sm text-slate-400">
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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
