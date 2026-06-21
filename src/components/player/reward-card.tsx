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
      return 'bg-secondary/10 text-secondary border-secondary/20'
    case RewardCategory.MERCHANDISE:
      return 'bg-secondary-container/20 text-secondary border-secondary-container/30'
    case RewardCategory.FREE_SESSION:
      return 'bg-primary-fixed/10 text-primary-fixed border-primary-fixed/20'
    case RewardCategory.FOOD_DRINK:
      return 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20'
    case RewardCategory.TOURNAMENT_ENTRY:
      return 'bg-error/10 text-error border-error/20'
    case RewardCategory.SPONSOR_VOUCHER:
      return 'bg-white/5 text-on-surface-variant border-white/10'
    case RewardCategory.VIP_ACCESS:
      return 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20'
    default:
      return 'bg-white/5 text-on-surface-variant border-white/10'
  }
}

function stockIndicator(stock: number): { label: string; color: string } {
  if (stock === 0)   return { label: 'Out of stock',       color: 'text-error' }
  if (stock <= 5)    return { label: `${stock} left`,       color: 'text-[#FFD700]/80' }
  if (stock <= 20)   return { label: `${stock} available`,  color: 'text-[#FFD700]' }
  return               { label: 'In stock',                 color: 'text-primary-fixed' }
}

export function RewardCard({ reward }: RewardCardProps) {
  const { label: stockLabel, color: stockColor } = stockIndicator(reward.stock)
  const isOutOfStock = reward.stock === 0
  const provider = reward.sponsor ?? reward.center ?? null
  const providerType = reward.sponsor ? 'Sponsor' : reward.center ? 'Center' : null

  return (
    <div
      className={cn(
        'group relative flex flex-col glass-card rounded-xl overflow-hidden',
        'transition-all duration-200 hover:border-primary-fixed/30 hover:shadow-lg hover:shadow-primary-fixed/5',
        isOutOfStock && 'opacity-60'
      )}
    >
      {/* Image area */}
      <div className="relative h-44 w-full bg-surface-container-lowest overflow-hidden">
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
            <span
              className="material-symbols-outlined text-on-surface-variant opacity-30"
              style={{ fontSize: '48px', fontVariationSettings: "'FILL' 1" }}
            >
              redeem
            </span>
          </div>
        )}

        {/* Category badge */}
        <span
          className={cn(
            'absolute top-3 left-3 rounded-full border px-2.5 py-0.5 text-label-caps font-bold',
            categoryStyle(reward.category)
          )}
        >
          {rewardCategoryLabel(reward.category)}
        </span>

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-container-lowest/60">
            <span className="rounded-full bg-surface-container/90 px-md py-xs text-label-caps font-bold text-error border border-error/30">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-sm p-md">
        {/* Provider label */}
        {provider && providerType && (
          <p className="text-label-caps text-on-surface-variant truncate">
            {providerType}: {provider.name}
          </p>
        )}

        {/* Title */}
        <h3 className="text-body-md font-bold text-on-surface leading-snug line-clamp-2">
          {reward.title}
        </h3>

        {/* Description */}
        <p className="text-label-caps text-on-surface-variant line-clamp-2 flex-1">
          {reward.description}
        </p>

        {/* Stock indicator */}
        <p className={cn('text-label-caps font-bold', stockColor)}>
          {stockLabel}
        </p>

        {/* Footer: points cost + redeem button */}
        <div className="mt-xs flex items-center justify-between gap-sm pt-sm border-t border-white/10">
          {/* Points cost */}
          <div className="flex items-baseline gap-1">
            <span className="text-stats-xl font-extrabold text-[#FFD700] leading-none">
              {reward.pointsCost.toLocaleString()}
            </span>
            <span className="text-label-caps font-bold text-[#FFD700]/80">
              pts
            </span>
          </div>

          {/* Redeem button */}
          <Link
            href={`/app/rewards/${reward.id}`}
            aria-disabled={isOutOfStock}
            tabIndex={isOutOfStock ? -1 : undefined}
            className={cn(
              'rounded-xl px-md py-sm text-label-caps font-bold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed',
              isOutOfStock
                ? 'pointer-events-none bg-surface-container-highest text-on-surface-variant cursor-not-allowed'
                : 'bg-primary-fixed text-on-primary-fixed hover:bg-primary-fixed-dim active:scale-95'
            )}
          >
            Redeem
          </Link>
        </div>
      </div>
    </div>
  )
}
