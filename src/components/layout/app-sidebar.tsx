'use client'

import { useState, useEffect } from 'react'
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
  Menu,
  X,
  Zap,
  TrendingUp,
  Flag,
  Map,
  Heart,
  Bell,
  Swords,
  Gavel,
  Leaf,
  Footprints,
  CalendarCheck,
  Compass,
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
  { label: 'Activities', href: '/app/activities', icon: Activity },
  { label: 'Training', href: '/app/training', icon: TrendingUp },
  { label: 'Wellness', href: '/app/wellness', icon: Heart },
  { label: 'Segments', href: '/app/segments', icon: Flag },
  { label: 'Routes', href: '/app/routes', icon: Map },
  { label: 'Challenges', href: '/app/challenges', icon: Trophy },
  { label: '1v1 Duels', href: '/app/challenges/direct', icon: Swords },
  { label: 'Leaderboards', href: '/app/leaderboards', icon: BarChart3 },
  { label: 'Rewards', href: '/app/rewards', icon: Gift },
  { label: 'Auctions', href: '/app/rewards/auctions', icon: Gavel },
  { label: 'Wallet', href: '/app/wallet', icon: Wallet },
  { label: 'Events', href: '/app/events', icon: Calendar },
  { label: 'Sessions', href: '/app/sessions', icon: CalendarCheck },
  { label: 'Gear', href: '/app/gear', icon: Footprints },
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

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────

interface DesktopSidebarProps {
  user: SessionUser
  pathname: string
  collapsed: boolean
  onToggle: () => void
}

function DesktopSidebar({ user, pathname, collapsed, onToggle }: DesktopSidebarProps) {
  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col h-screen sticky top-0 bg-slate-900 border-r border-white/10 transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center h-16 border-b border-white/10 shrink-0 px-3',
          collapsed ? 'justify-center' : 'justify-between px-4'
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
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white',
            collapsed && 'hidden'
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          type="button"
          onClick={onToggle}
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
                collapsed && 'justify-center px-2'
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
            collapsed && 'justify-center'
          )}
          title={collapsed ? user.name : undefined}
        >
          {/* Avatar */}
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

// ─── Mobile Drawer ────────────────────────────────────────────────────────────

interface MobileDrawerProps {
  user: SessionUser
  pathname: string
  open: boolean
  onClose: () => void
}

function MobileDrawer({ user, pathname, open, onClose }: MobileDrawerProps) {
  // Close on route change
  useEffect(() => {
    onClose()
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      />

      {/* Drawer panel */}
      <aside
        aria-label="Navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4 shrink-0">
          <Link
            href="/app"
            className="flex items-center gap-2 text-white font-bold text-lg tracking-tight"
            onClick={onClose}
          >
            <Zap className="h-5 w-5 text-green-500" />
            <span>
              Garrincha <span className="text-green-500">Active</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = isRouteActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-green-600 text-white'
                    : 'text-slate-400 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User info */}
        <div className="border-t border-white/10 p-4 shrink-0">
          <Link
            href="/app/settings"
            onClick={onClose}
            className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-white/10"
          >
            <div className="h-9 w-9 shrink-0 rounded-full bg-green-700 flex items-center justify-center text-white text-sm font-bold select-none">
              {getInitials(user.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white leading-tight">
                {user.name}
              </p>
              <p className="truncate text-xs text-slate-400 leading-tight">
                @{user.nickname}
              </p>
            </div>
          </Link>
        </div>
      </aside>
    </>
  )
}

// ─── Mobile Top Bar ───────────────────────────────────────────────────────────

interface MobileTopBarProps {
  onOpen: () => void
}

function MobileTopBar({ onOpen }: MobileTopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-slate-900/90 px-4 backdrop-blur-md lg:hidden">
      <button
        type="button"
        onClick={onOpen}
        aria-label="Open navigation"
        className="rounded-md p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Menu className="h-5 w-5" />
      </button>
      <Link
        href="/app"
        className="flex items-center gap-1.5 text-base font-bold tracking-tight text-white"
      >
        <Zap className="h-4 w-4 text-green-500" />
        <span>
          Garrincha <span className="text-green-500">Active</span>
        </span>
      </Link>
      {/* Spacer to balance the hamburger */}
      <div className="w-9" aria-hidden="true" />
    </header>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <DesktopSidebar
        user={user}
        pathname={pathname}
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
      />

      {/* Mobile top bar (visible on small screens) */}
      <MobileTopBar onOpen={() => setDrawerOpen(true)} />

      {/* Mobile slide-out drawer */}
      <MobileDrawer
        user={user}
        pathname={pathname}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  )
}
