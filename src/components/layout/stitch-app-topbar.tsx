import Link from 'next/link'
import { cn } from '@/lib/utils'

interface StitchAppTopBarProps {
  unreadCount: number
  className?: string
}

export default function StitchAppTopBar({ unreadCount, className }: StitchAppTopBarProps) {
  return (
    <header
      className={cn(
        'fixed top-0 w-full z-50 flex justify-between items-center px-margin-mobile h-16',
        'bg-surface/80 backdrop-blur-xl',
        className,
      )}
    >
      {/* Logo */}
      <Link href="/app" className="flex items-center gap-2">
        <span
          className="material-symbols-outlined text-primary-fixed-dim"
          style={{ fontVariationSettings: "'FILL' 1", fontSize: '28px' }}
        >
          sports_tennis
        </span>
        <span className="text-headline-md text-primary-fixed-dim tracking-tighter">GG</span>
      </Link>

      {/* Notification bell */}
      <Link
        href="/app/notifications"
        aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ''}`}
        className="relative hover:opacity-80 transition-opacity active:scale-95"
      >
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '24px' }}>
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary-fixed rounded-full border-2 border-surface" />
        )}
      </Link>
    </header>
  )
}
