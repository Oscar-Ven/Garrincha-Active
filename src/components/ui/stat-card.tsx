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
      ? 'text-green-600'
      : trend === 'down'
        ? 'text-red-500'
        : 'text-slate-400'

  const trendIcon =
    trend === 'up' ? (
      <svg
        className="w-3 h-3"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M6 2L10 6H7V10H5V6H2L6 2Z"
          fill="currentColor"
        />
      </svg>
    ) : trend === 'down' ? (
      <svg
        className="w-3 h-3"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M6 10L2 6H5V2H7V6H10L6 10Z"
          fill="currentColor"
        />
      </svg>
    ) : null

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-sm font-medium text-slate-500 truncate">{title}</span>
          <span className="text-3xl font-bold text-slate-900 leading-none tabular-nums">
            {value}
          </span>
        </div>
        {icon && (
          <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
            {icon}
          </div>
        )}
      </div>

      {(subtitle || trendValue) && (
        <div className="flex items-center gap-2 flex-wrap">
          {trendValue && trend && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-semibold',
                trendColor
              )}
            >
              {trendIcon}
              {trendValue}
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-slate-400 truncate">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  )
}
