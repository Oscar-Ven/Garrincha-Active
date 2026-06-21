import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  className?: string
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  className,
}: StatCardProps) {
  const trendColor =
    trend === 'up'
      ? 'text-primary-fixed'
      : trend === 'down'
        ? 'text-error'
        : 'text-on-surface-variant'

  const trendIcon =
    trend === 'up' ? (
      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 2L10 6H7V10H5V6H2L6 2Z" fill="currentColor" />
      </svg>
    ) : trend === 'down' ? (
      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 10L2 6H5V2H7V6H10L6 10Z" fill="currentColor" />
      </svg>
    ) : null

  return (
    <div className={cn('glass-card rounded-xl p-md flex flex-col gap-sm', className)}>
      <div className="flex items-start justify-between gap-sm">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-label-caps text-on-surface-variant truncate">{title}</span>
          <span className="text-stats-xl font-bold text-on-surface leading-none tabular-nums">
            {value}
          </span>
        </div>
        {icon && (
          <div className="shrink-0 w-10 h-10 rounded-xl bg-primary-fixed/10 flex items-center justify-center text-primary-fixed">
            {icon}
          </div>
        )}
      </div>

      {(subtitle || trendValue) && (
        <div className="flex items-center gap-2 flex-wrap">
          {trendValue && trend && (
            <span className={cn('inline-flex items-center gap-0.5 text-label-caps font-bold', trendColor)}>
              {trendIcon}
              {trendValue}
            </span>
          )}
          {subtitle && (
            <span className="text-label-caps text-on-surface-variant truncate">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  )
}
