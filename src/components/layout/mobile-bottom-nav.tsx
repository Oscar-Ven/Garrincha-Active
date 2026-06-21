'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const tabs = [
  { label: 'Home',     href: '/app',          icon: 'home',           exact: true  },
  { label: 'Discover', href: '/app/discover',  icon: 'explore',        exact: false },
  { label: 'Matches',  href: '/app/matches',   icon: 'sports_kabaddi', exact: false },
  { label: 'Chat',     href: '/app/chat',      icon: 'chat_bubble',    exact: false },
  { label: 'Profile',  href: '/app/profile',   icon: 'person',         exact: false },
]

export default function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 lg:hidden bg-surface/80 backdrop-blur-xl flex justify-around items-center px-xs py-sm pb-safe">
      {tabs.map(({ label, href, icon, exact }) => {
        const active = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(href + '/')

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 transition-all',
              active
                ? 'text-primary-fixed-dim scale-110'
                : 'text-on-surface-variant hover:text-primary-fixed-dim',
            )}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '24px',
                fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              {icon}
            </span>
            <span className="text-label-caps">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
