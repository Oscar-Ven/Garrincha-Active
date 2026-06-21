'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { RewardCategory } from '@/generated/prisma'
import { rewardCategoryLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'

const ALL_VALUE = 'ALL'

const CATEGORIES: { value: string; label: string }[] = [
  { value: ALL_VALUE, label: 'All' },
  { value: RewardCategory.DISCOUNT,         label: rewardCategoryLabel(RewardCategory.DISCOUNT) },
  { value: RewardCategory.MERCHANDISE,      label: rewardCategoryLabel(RewardCategory.MERCHANDISE) },
  { value: RewardCategory.FREE_SESSION,     label: rewardCategoryLabel(RewardCategory.FREE_SESSION) },
  { value: RewardCategory.FOOD_DRINK,       label: rewardCategoryLabel(RewardCategory.FOOD_DRINK) },
  { value: RewardCategory.TOURNAMENT_ENTRY, label: rewardCategoryLabel(RewardCategory.TOURNAMENT_ENTRY) },
  { value: RewardCategory.SPONSOR_VOUCHER,  label: rewardCategoryLabel(RewardCategory.SPONSOR_VOUCHER) },
  { value: RewardCategory.VIP_ACCESS,       label: rewardCategoryLabel(RewardCategory.VIP_ACCESS) },
]

export function CategoryTabs() {
  const searchParams = useSearchParams()
  const active = searchParams.get('category') ?? ALL_VALUE

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter rewards by category">
      {CATEGORIES.map(({ value, label }) => {
        const isActive = active === value
        const href =
          value === ALL_VALUE
            ? '/app/rewards'
            : `/app/rewards?category=${value}`

        return (
          <Link
            key={value}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              'rounded-full px-md py-1.5 text-label-caps font-bold transition-all duration-150 whitespace-nowrap',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed',
              isActive
                ? 'bg-primary-fixed text-on-primary-fixed'
                : 'glass-card text-on-surface-variant hover:text-on-surface'
            )}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
