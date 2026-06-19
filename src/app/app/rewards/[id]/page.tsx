import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { redeemReward } from '@/services/rewards'
import { Badge } from '@/components/ui/badge'
import { cn, formatDate, rewardCategoryLabel } from '@/lib/utils'
import { RedemptionStatus } from '@/generated/prisma'
import RedeemButton from './RedeemButton'
import { QRCodeDisplay } from '@/components/ui/qr-code-display'

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getReward(id: string) {
  return prisma.reward.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      imageUrl: true,
      pointsCost: true,
      stock: true,
      category: true,
      isActive: true,
      expiresAt: true,
      createdAt: true,
      center: { select: { id: true, name: true } },
      sponsor: { select: { id: true, name: true, logoUrl: true } },
      _count: { select: { redemptions: true } },
    },
  })
}

async function getUserPoints(userId: string): Promise<number> {
  const profile = await prisma.playerProfile.findUnique({
    where: { userId },
    select: { totalPoints: true },
  })
  return profile?.totalPoints ?? 0
}

async function getExistingRedemption(userId: string, rewardId: string) {
  return prisma.rewardRedemption.findFirst({
    where: {
      userId,
      rewardId,
      status: { in: [RedemptionStatus.PENDING, RedemptionStatus.USED] },
    },
    select: {
      id: true,
      redemptionCode: true,
      status: true,
      pointsSpent: true,
      createdAt: true,
      usedAt: true,
    },
  })
}

type Reward = NonNullable<Awaited<ReturnType<typeof getReward>>>

// ─── Server Action ─────────────────────────────────────────────────────────────

async function redeemRewardAction(rewardId: string): Promise<void> {
  'use server'
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  let redemptionCode: string | null = null
  try {
    const redemption = await redeemReward(user.id, rewardId)
    redemptionCode = redemption.redemptionCode
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Redemption failed'
    redirect(`/app/rewards/${rewardId}?error=${encodeURIComponent(msg)}`)
  }

  if (redemptionCode) {
    redirect(`/app/rewards/${rewardId}?redeemed=1&code=${redemptionCode}`)
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const reward = await getReward(id)
  if (!reward) return { title: 'Reward Not Found' }
  return {
    title: reward.title,
    description: `${rewardCategoryLabel(reward.category)} — ${reward.pointsCost.toLocaleString()} pts`,
  }
}

// ─── Helper components ────────────────────────────────────────────────────────

function categoryIcon(category: Reward['category']): string {
  switch (category) {
    case 'DISCOUNT':          return '🏷️'
    case 'MERCHANDISE':       return '👕'
    case 'FREE_SESSION':      return '🎯'
    case 'FOOD_DRINK':        return '☕'
    case 'TOURNAMENT_ENTRY':  return '🏆'
    case 'SPONSOR_VOUCHER':   return '🎫'
    case 'VIP_ACCESS':        return '⭐'
    default:                  return '🎁'
  }
}

function CategoryBadge({ category }: { category: Reward['category'] }) {
  return (
    <Badge variant="secondary" className="flex items-center gap-1.5 w-fit">
      <span>{categoryIcon(category)}</span>
      <span>{rewardCategoryLabel(category)}</span>
    </Badge>
  )
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === -1) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-green-600/40 bg-green-600/10 px-3 py-1 text-xs font-semibold text-green-400">
        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
        Unlimited
      </span>
    )
  }
  if (stock <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
        Out of stock
      </span>
    )
  }
  if (stock <= 5) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Only {stock} left
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-700/50 px-3 py-1 text-xs font-semibold text-slate-300">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      {stock.toLocaleString()} in stock
    </span>
  )
}

// ─── SVG icons ────────────────────────────────────────────────────────────────

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  )
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RewardDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ redeemed?: string; code?: string; error?: string }>
}) {
  const { id } = await params
  const sp = await searchParams

  const [reward, currentUser] = await Promise.all([
    getReward(id),
    getCurrentUser(),
  ])

  if (!reward) {
    notFound()
  }

  // Parallel data fetches that depend on currentUser
  const [userPoints, existingRedemption] = await Promise.all([
    currentUser ? getUserPoints(currentUser.id) : Promise.resolve(0),
    currentUser ? getExistingRedemption(currentUser.id, id) : Promise.resolve(null),
  ])

  // Success state from URL search param (after server action redirect)
  const justRedeemed = sp.redeemed === '1' && !!sp.code
  const redemptionCodeFromUrl = sp.code ?? null
  const errorMsg = sp.error ? decodeURIComponent(sp.error) : null

  // Determine the active redemption to display
  const activeRedemption = existingRedemption ?? null

  // Determine availability
  const isExpired = reward.expiresAt !== null && reward.expiresAt < new Date()
  const isOutOfStock = reward.stock !== -1 && reward.stock <= 0
  const isUnavailable = !reward.isActive || isExpired || isOutOfStock
  const hasEnoughPoints = userPoints >= reward.pointsCost
  const alreadyRedeemed = activeRedemption !== null

  const boundRedeemAction = redeemRewardAction.bind(null, id)

  return (
    <div className="mx-auto max-w-3xl space-y-4">

      {/* ── Back button ── */}
      <Link
        href="/app/rewards"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-200"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Back to Rewards
      </Link>

      {/* ── Success banner ── */}
      {justRedeemed && redemptionCodeFromUrl && (
        <div className="rounded-xl border border-green-600/40 bg-green-600/10 px-5 py-6">
          <div className="flex items-start gap-3 mb-5">
            <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-green-400">Redemption successful!</p>
              <p className="mt-1 text-sm text-slate-300">
                Show the QR code below at the venue to claim your reward.
              </p>
            </div>
          </div>
          <QRCodeDisplay value={redemptionCodeFromUrl} label="Scan or show this code at the venue" />
          <p className="mt-4 text-xs text-slate-500 text-center">
            This code is also saved in your redemption history.
          </p>
        </div>
      )}

      {/* ── Error banner ── */}
      {errorMsg && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-4">
          <WarningIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-semibold text-red-400">Redemption failed</p>
            <p className="mt-0.5 text-sm text-red-300/80">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* ── Already redeemed banner ── */}
      {!justRedeemed && activeRedemption && (
        <div className="rounded-xl border border-yellow-600/40 bg-yellow-600/10 px-5 py-6">
          <div className="flex items-start gap-3 mb-5">
            <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
            <div>
              <p className="font-semibold text-yellow-400">Already redeemed</p>
              <p className="mt-0.5 text-sm text-slate-300">
                Redeemed on {formatDate(activeRedemption.createdAt, 'MMM d, yyyy')} ·{' '}
                <span className={activeRedemption.status === RedemptionStatus.USED ? 'text-slate-400' : 'text-yellow-400'}>
                  {activeRedemption.status === RedemptionStatus.USED ? 'Used' : 'Pending'}
                </span>
                {' '}· {activeRedemption.pointsSpent.toLocaleString()} pts
              </p>
            </div>
          </div>
          <QRCodeDisplay value={activeRedemption.redemptionCode} label="Show this code at the venue" />
        </div>
      )}

      {/* ── Main card ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 shadow-sm">

        {/* Image or placeholder */}
        {reward.imageUrl ? (
          <div className="relative h-48 w-full sm:h-64">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={reward.imageUrl}
              alt={reward.title}
              className="h-full w-full object-cover"
            />
            {/* Category pill overlay */}
            <div className="absolute bottom-3 left-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                {categoryIcon(reward.category)} {rewardCategoryLabel(reward.category)}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex h-36 items-center justify-center bg-gradient-to-br from-green-950/50 via-slate-800 to-slate-900 sm:h-44">
            <span className="text-5xl" role="img" aria-label={rewardCategoryLabel(reward.category)}>
              {categoryIcon(reward.category)}
            </span>
          </div>
        )}

        {/* Body */}
        <div className="p-6">
          {/* Category + badges row */}
          <div className="flex flex-wrap items-center gap-2">
            {!reward.imageUrl && <CategoryBadge category={reward.category} />}
            {!reward.isActive && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-700/50 px-3 py-1 text-xs font-semibold text-slate-400">
                Inactive
              </span>
            )}
            {isExpired && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
                Expired
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="mt-3 text-2xl font-bold leading-tight text-white sm:text-3xl">
            {reward.title}
          </h1>

          {/* Description */}
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            {reward.description}
          </p>

          {/* Details grid */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {/* Points cost */}
            <div className="flex flex-col gap-1.5 rounded-xl border border-yellow-600/30 bg-yellow-600/5 px-4 py-3">
              <div className="flex items-center gap-1.5 text-slate-400">
                <StarIcon className="h-4 w-4 text-yellow-400" />
                <span className="text-xs font-medium uppercase tracking-wide">Cost</span>
              </div>
              <p className="text-xl font-bold text-yellow-400">
                {reward.pointsCost.toLocaleString()} pts
              </p>
            </div>

            {/* Stock */}
            <div className="flex flex-col gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3">
              <div className="flex items-center gap-1.5 text-slate-400">
                <TagIcon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Stock</span>
              </div>
              <div className="pt-0.5">
                <StockBadge stock={reward.stock} />
              </div>
            </div>

            {/* Expiry */}
            {reward.expiresAt && (
              <div className="flex flex-col gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <ClockIcon className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Expires</span>
                </div>
                <p className={cn(
                  'text-sm font-semibold',
                  isExpired ? 'text-red-400' : 'text-slate-200',
                )}>
                  {formatDate(reward.expiresAt, 'MMM d, yyyy')}
                </p>
              </div>
            )}
          </div>

          {/* Attribution */}
          {(reward.center || reward.sponsor) && (
            <div className="mt-5 space-y-2.5">
              {reward.sponsor && (
                <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3">
                  {reward.sponsor.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={reward.sponsor.logoUrl}
                      alt={reward.sponsor.name}
                      className="h-8 w-8 rounded-md object-contain"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-700">
                      <TagIcon className="h-4 w-4 text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Sponsored by</p>
                    <p className="truncate text-sm font-semibold text-slate-200">
                      {reward.sponsor.name}
                    </p>
                  </div>
                </div>
              )}
              {reward.center && (
                <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-700">
                    <BuildingIcon className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Available at</p>
                    <p className="truncate text-sm font-semibold text-slate-200">
                      {reward.center.name}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── User points + Redeem section ── */}
      {currentUser && (
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
          {/* User balance */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <StarIcon className="h-4 w-4 text-yellow-400" />
              <span>Your balance</span>
            </div>
            <span className={cn(
              'text-lg font-bold',
              hasEnoughPoints ? 'text-yellow-400' : 'text-red-400',
            )}>
              {userPoints.toLocaleString()} pts
            </span>
          </div>

          {/* Points shortfall */}
          {!hasEnoughPoints && !alreadyRedeemed && !isUnavailable && (
            <p className="mt-2 text-xs text-red-400">
              You need {(reward.pointsCost - userPoints).toLocaleString()} more points to redeem this reward.
            </p>
          )}

          <div className="mt-4 border-t border-slate-700 pt-4">
            {alreadyRedeemed ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
                <span>You have already redeemed this reward.</span>
              </div>
            ) : isUnavailable ? (
              <p className="text-sm text-slate-500">
                {!reward.isActive && 'This reward is no longer active.'}
                {reward.isActive && isExpired && 'This reward has expired.'}
                {reward.isActive && !isExpired && isOutOfStock && 'This reward is out of stock.'}
              </p>
            ) : (
              <RedeemButton
                rewardTitle={reward.title}
                pointsCost={reward.pointsCost}
                userPoints={userPoints}
                hasEnoughPoints={hasEnoughPoints}
                redeemAction={boundRedeemAction}
              />
            )}
          </div>
        </div>
      )}

      {!currentUser && (
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6 text-center">
          <p className="text-sm text-slate-400">
            <Link href="/login" className="font-medium text-green-400 hover:underline">
              Sign in
            </Link>{' '}
            to redeem this reward.
          </p>
        </div>
      )}

      {/* ── Footer meta ── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-slate-500">
        <span>
          Added{' '}
          <span className="text-slate-400">{formatDate(reward.createdAt, 'MMM d, yyyy')}</span>
        </span>
        <span>
          Redeemed{' '}
          <span className="text-slate-400">{reward._count.redemptions.toLocaleString()} times</span>
        </span>
        <span className="font-mono text-slate-600">{reward.id}</span>
      </div>

    </div>
  )
}
