'use client'

import { useState, useTransition } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  rewardTitle: string
  pointsCost: number
  userPoints: number
  hasEnoughPoints: boolean
  redeemAction: () => Promise<void>
}

export default function RedeemButton({
  rewardTitle,
  pointsCost,
  userPoints,
  hasEnoughPoints,
  redeemAction,
}: Props) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      await redeemAction()
    })
  }

  if (!showConfirm) {
    return (
      <button
        type="button"
        disabled={!hasEnoughPoints}
        onClick={() => setShowConfirm(true)}
        className={cn(
          'w-full rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
          hasEnoughPoints
            ? 'bg-green-600 text-white hover:bg-green-700 active:scale-[0.98] shadow-sm shadow-green-900/40'
            : 'cursor-not-allowed bg-slate-700 text-slate-500',
        )}
      >
        {hasEnoughPoints
          ? `Redeem for ${pointsCost.toLocaleString()} pts`
          : `Need ${(pointsCost - userPoints).toLocaleString()} more pts`}
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={() => !isPending && setShowConfirm(false)}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2"
      >
        {/* Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-yellow-600/10 ring-1 ring-yellow-600/30">
          <svg
            className="h-7 w-7 text-yellow-400"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>

        {/* Text */}
        <div className="mt-4 text-center">
          <h2
            id="confirm-title"
            className="text-lg font-bold text-white"
          >
            Confirm Redemption
          </h2>
          <p
            id="confirm-desc"
            className="mt-2 text-sm text-slate-300"
          >
            Redeem{' '}
            <span className="font-semibold text-white">{rewardTitle}</span>{' '}
            for{' '}
            <span className="font-bold text-yellow-400">
              {pointsCost.toLocaleString()} pts
            </span>
            ?
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Your balance after redemption:{' '}
            <span className="font-medium text-slate-400">
              {(userPoints - pointsCost).toLocaleString()} pts
            </span>
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row-reverse">
          <button
            type="button"
            disabled={isPending}
            onClick={handleConfirm}
            className={cn(
              'flex-1 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
              isPending
                ? 'cursor-not-allowed bg-green-700/60 text-green-300'
                : 'bg-green-600 text-white hover:bg-green-700 active:scale-[0.98] shadow-sm shadow-green-900/40',
            )}
          >
            {isPending ? 'Processing...' : 'Confirm Redeem'}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setShowConfirm(false)}
            className={cn(
              'flex-1 rounded-xl border border-slate-600 bg-slate-700 px-5 py-3 text-sm font-medium text-slate-300 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500',
              'hover:bg-slate-600 hover:text-white',
              isPending && 'cursor-not-allowed opacity-50',
            )}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}
