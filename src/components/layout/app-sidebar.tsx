'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Rss,
  Activity,
  Trophy,
  BarChart3,
  Gift,
  Wallet,
  Calendar,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  TrendingUp,
  Heart,
  Bell,
  Swords,
  Gavel,
  Footprints,
  CalendarCheck,
  Compass,
  Target,
  Award,
  CreditCard,
  MapPin,
  Clock,
  Handshake,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SessionUser } from '@/lib/auth'

interface AppSidebarProps {
  user: SessionUser
}

const navItems = [
  { label: 'Dashboard', href: '/app', icon: LayoutDashboard },
  { label: 'Feed', href: '/app/feed', icon: Rss },
  { label: 'Explore', href: '/app/explore', icon: Compass },
  { label: 'Matches & Sessions', href: '/app/activities', icon: Activity },
  { label: 'Matches', href: '/app/matches', icon: Swords },
  { label: 'Training', href: '/app/training', icon: TrendingUp },
  { label: 'Wellness', href: '/app/wellness', icon: Heart },
  { label: 'Challenges', href: '/app/challenges', icon: Trophy },
  { label: '1v1 Duels', href: '/app/challenges/direct', icon: Swords },
  { label: 'Leaderboards', href: '/app/leaderboards', icon: BarChart3 },
  { label: 'Rewards', href: '/app/rewards', icon: Gift },
  { label: 'Auctions', href: '/app/rewards/auctions', icon: Gavel },
  { label: 'Wallet', href: '/app/wallet', icon: Wallet },
  { label: 'Events', href: '/app/events', icon: Calendar },
  { label: 'Sessions', href: '/app/sessions', icon: CalendarCheck },
  { label: 'Find Courts', href: '/app/map', icon: MapPin },
  { label: 'Book Court', href: '/app/courts', icon: CalendarCheck },
  { label: 'Availability', href: '/app/availability', icon: Clock },
  { label: 'Sponsors', href: '/app/sponsors', icon: Handshake },
  { label: 'Membership', href: '/app/membership', icon: CreditCard },
  { label: 'Gear', href: '/app/gear', icon: Footprints },
  { label: 'Goals', href: '/app/goals', icon: Target },
  { label: 'Badges', href: '/app/badges', icon: Award },
  { label: 'Teams', href: '/app/teams', icon: Users },
  { label: 'Notifications', href: '/app/notifications', icon: Bell },
  { label: 'Settings', href: '/app/settings', icon: Settings },
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function isRouteActive(pathname: string, href: string): boolean {
  if (href === '/app') {
    return pathname === '/app'
  }
  return pathname === href || pathname.startsWith(href + '/')
}

export default function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col h-screen sticky top-0 bg-slate-900 border-r border-white/10 transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center h-16 border-b border-white/10 shrink-0 px-3',
          collapsed ? 'justify-center' : 'justify-between px-4',
        )}
      >
        {!collapsed && (
          <Link
            href="/app"
            className="flex items-center gap-2 text-white font-bold text-lg tracking-tight min-w-0"
          >
            <span className="text-green-500 shrink-0">
              <Zap className="h-5 w-5" />
            </span>
            <span className="truncate">
              Garrincha <span className="text-green-500">Active</span>
            </span>
          </Link>
        )}
        {collapsed && (
          <Link href="/app" aria-label="Dashboard">
            <Zap className="h-5 w-5 text-green-500" />
          </Link>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white',
            collapsed && 'hidden',
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          className="mx-auto mt-2 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = isRouteActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-2 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-green-600 text-white'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white',
                collapsed && 'justify-center px-2',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      <div className="border-t border-white/10 p-3 shrink-0">
        <Link
          href="/app/settings"
          className={cn(
            'flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-white/10',
            collapsed && 'justify-center',
          )}
          title={collapsed ? user.name : undefined}
        >
          <div className="h-8 w-8 shrink-0 rounded-full bg-green-700 flex items-center justify-center text-white text-xs font-bold select-none">
            {getInitials(user.name)}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white leading-tight">
                {user.name}
              </p>
              <p className="truncate text-xs text-slate-400 leading-tight">
                @{user.nickname}
              </p>
            </div>
          )}
        </Link>
      </div>
    </aside>
  )
}
