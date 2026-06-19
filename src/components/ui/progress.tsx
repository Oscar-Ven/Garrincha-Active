'use client'

import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'

type ProgressColor = 'green' | 'gold' | 'blue' | 'red' | 'white'

const colorMap: Record<ProgressColor, string> = {
  green: 'bg-green-600',
  gold: 'bg-yellow-600',
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  white: 'bg-white',
}

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value?: number
  color?: ProgressColor
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value = 0, color = 'green', ...props }, ref) => {
  const clampedValue = Math.min(100, Math.max(0, value))

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-white/20',
        className
      )}
      value={clampedValue}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          'h-full w-full flex-1 transition-all duration-500 ease-in-out',
          colorMap[color]
        )}
        style={{ transform: `translateX(-${100 - clampedValue}%)` }}
      />
    </ProgressPrimitive.Root>
  )
})

Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
