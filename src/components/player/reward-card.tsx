import Link from 'next/link'
import Image from 'next/image'
import { RewardCategory } from '@/generated/prisma'
import { cn, rewardCategoryLabel } from '@/lib/utils'

interface RewardCardProps {
  reward: {
    id: string
    title: string
    description: string
    pointsCost: number
    category: RewardCategory
    stock: number
    imageUrl?: string | null
    sponsor?: { id: string; name: string } | null
    center?: { id: string; name: string } | null
  }
}

function categoryStyle(category: RewardCategory): string {
  switch (category) {
    case RewardCategory.DISCOUNT:
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    case RewardCategory.MERCHANDISE:
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    case RewardCategory.FREE_SESSION:
      return 'bg-green-500/20 text-green-300 border-green-500/30'
    case RewardCategory.FOOD_DRINK:
      return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    case RewardCategory.TOURNAMENT_ENTRY:
      return 'bg-red-500/20 text-red-300 border-red-500/30'
    case RewardCategory.SPONSOR_VOUCHER:
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    case RewardCategory.VIP_ACCESS:
      return 'bg-pink-500/20 text-pink-300 border-pink-500/30'
    default:
      return 'bg-slate-500/20 text-slate-300 border-slate-500/30'
  }
}

function stockIndicator(stock: number): { label: string; color: string } {
  if (stock === 0) return { label: 'Out of stock', color: 'text-red-400' }
  if (stock <= 5) return { label: `${stock} left`, color: 'text-orange-400' }
  if (stock <= 20) return { label: `${stock} available`, color: 'text-yellow-400' }
  return { label: 'In stock', color: 'text-green-400' }
}

export function RewardCard({ reward }: RewardCardProps) {
  const { label: stockLabel, color: stockColor } = stockIndicator(reward.stock)
  const isOutOfStock = reward.stock === 0
  const provider = reward.sponsor ?? reward.center ?? null
  const providerType = reward.sponsor ? 'Sponsor' : reward.center ? 'Center' : null

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-2xl border border-slate-700/60 bg-slate-800/60 backdrop-blur-sm overflow-hidden',
        'transition-all duration-200 hover:border-green-600/50 hover:shadow-lg hover:shadow-green-900/20',
        isOutOfStock && 'opacity-60'
      )}
    >
      {/* Image area */}
      <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
        {reward.imageUrl ? (
          <Image
            src={reward.imageUrl}
            alt={reward.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-5xl select-none opacity-30">🎁</span>
          </div>
        )}

        {/* Category badge */}
        <span
          className={cn(
            'absolute top-3 left-3 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide',
            categoryStyle(reward.category)
          )}
        >
          {rewardCategoryLabel(reward.category)}
        </span>

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60">
            <span className="rounded-full bg-slate-800/90 px-3 py-1 text-sm font-semibold text-red-400 border border-red-500/40">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Provider label */}
        {provider && providerType && (
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest truncate">
            {providerType}: {provider.name}
          </p>
        )}

        {/* Title */}
        <h3 className="text-base font-bold text-white leading-snug line-clamp-2">
          {reward.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-slate-400 line-clamp-2 flex-1">
          {reward.description}
        </p>

        {/* Stock indicator */}
        <p className={cn('text-xs font-medium', stockColor)}>
          {stockLabel}
        </p>

        {/* Footer: points cost + redeem button */}
        <div className="mt-1 flex items-center justify-between gap-3 pt-2 border-t border-slate-700/50">
          {/* Points cost */}
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-yellow-400 leading-none">
              {reward.pointsCost.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-yellow-500/80 uppercase tracking-wide">
              pts
            </span>
          </div>

          {/* Redeem button */}
          <Link
            href={`/app/rewards/${reward.id}`}
            aria-disabled={isOutOfStock}
            tabIndex={isOutOfStock ? -1 : undefined}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-bold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500',
              isOutOfStock
                ? 'pointer-events-none bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-500 active:scale-95 shadow-sm shadow-green-900/40'
            )}
          >
            Redeem
          </Link>
        </div>
      </div>
    </div>
  )
}
