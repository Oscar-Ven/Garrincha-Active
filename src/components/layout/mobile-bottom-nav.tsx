'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Rss, Activity, Compass, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { label: 'Home',    href: '/app',               icon: Home,    exact: true },
  { label: 'Feed',    href: '/app/feed',           icon: Rss,     exact: false },
  { label: 'Log',     href: '/app/activities/new', icon: Activity, exact: false, fab: true },
  { label: 'Explore', href: '/app/explore',        icon: Compass, exact: false },
  { label: 'Profile', href: '/app/profile',        icon: User,    exact: false },
]

export default function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden">
      {/* Blur + border */}
      <div className="border-t border-white/10 bg-slate-900/95 backdrop-blur-md">
        <div className="flex items-end justify-around px-2 pb-safe">
          {tabs.map(({ label, href, icon: Icon, exact, fab }) => {
            const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

            if (fab) {
              return (
                <Link
                  key={href}
                  href={href}
                  aria-label="Log activity"
                  className="relative -top-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 shadow-lg shadow-green-900/50 ring-4 ring-slate-900 transition-transform active:scale-95"
                >
                  <Icon className="h-6 w-6 text-white" />
                </Link>
              )
            }

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 min-w-0 transition-colors',
                  active ? 'text-green-400' : 'text-slate-500',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="text-[10px] font-medium leading-none truncate">{label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
