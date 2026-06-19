'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Building2,
  Activity,
  Gift,
  Ticket,
  Trophy,
  Calendar,
  Shield,
  Star,
  Eye,
  FileBarChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Flag,
  Map,
  Gavel,
  CalendarCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Players', href: '/admin/players', icon: Users },
  { label: 'Centers', href: '/admin/centers', icon: Building2 },
  { label: 'Activities', href: '/admin/activities', icon: Activity },
  { label: 'Segments', href: '/admin/segments', icon: Flag },
  { label: 'Routes', href: '/admin/routes', icon: Map },
  { label: 'Rewards', href: '/admin/rewards', icon: Gift },
  { label: 'Auctions', href: '/admin/rewards/auctions', icon: Gavel },
  { label: 'Redemptions', href: '/admin/redemptions', icon: Ticket },
  { label: 'Challenges', href: '/admin/challenges', icon: Trophy },
  { label: 'Events', href: '/admin/events', icon: Calendar },
  { label: 'Sessions', href: '/admin/sessions', icon: CalendarCheck },
  { label: 'Teams', href: '/admin/teams', icon: Shield },
  { label: 'Sponsors', href: '/admin/sponsors', icon: Star },
  { label: 'Moderation', href: '/admin/moderation', icon: Eye },
  { label: 'Reports', href: '/admin/reports', icon: FileBarChart },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

function isRouteActive(pathname: string, href: string): boolean {
  if (href === '/admin') {
    return pathname === '/admin'
  }
  return pathname === href || pathname.startsWith(href + '/')
}

// ─── Logo Mark ────────────────────────────────────────────────────────────────

function LogoMark({ className }: { className?: string }) {
  return <Shield className={cn('h-5 w-5', className)} />
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────

interface DesktopSidebarProps {
  pathname: string
  collapsed: boolean
  onToggle: () => void
}

function DesktopSidebar({ pathname, collapsed, onToggle }: DesktopSidebarProps) {
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
            href="/admin"
            className="flex items-center gap-2 text-white font-bold text-lg tracking-tight min-w-0"
          >
            <LogoMark className="text-green-500 shrink-0" />
            <span className="truncate">
              Garrincha <span className="text-green-500">Admin</span>
            </span>
          </Link>
        )}
        {collapsed && (
          <Link href="/admin" aria-label="Admin overview">
            <LogoMark className="text-green-500" />
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

      {/* Bottom branding strip */}
      <div className="border-t border-white/10 p-3 shrink-0">
        {!collapsed && (
          <p className="text-xs text-slate-500 text-center tracking-wide uppercase select-none">
            Platform Admin
          </p>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <LogoMark className="text-slate-600 h-4 w-4" />
          </div>
        )}
      </div>
    </aside>
  )
}

// ─── Mobile Drawer ────────────────────────────────────────────────────────────

interface MobileDrawerProps {
  pathname: string
  open: boolean
  onClose: () => void
}

function MobileDrawer({ pathname, open, onClose }: MobileDrawerProps) {
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
        aria-label="Admin navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4 shrink-0">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-white font-bold text-lg tracking-tight"
            onClick={onClose}
          >
            <LogoMark className="text-green-500" />
            <span>
              Garrincha <span className="text-green-500">Admin</span>
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

        {/* Bottom branding strip */}
        <div className="border-t border-white/10 p-4 shrink-0">
          <p className="text-xs text-slate-500 text-center tracking-wide uppercase select-none">
            Platform Admin
          </p>
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
        href="/admin"
        className="flex items-center gap-1.5 text-base font-bold tracking-tight text-white"
      >
        <LogoMark className="text-green-500 h-4 w-4" />
        <span>
          Garrincha <span className="text-green-500">Admin</span>
        </span>
      </Link>
      {/* Spacer to balance the hamburger */}
      <div className="w-9" aria-hidden="true" />
    </header>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function AdminSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <DesktopSidebar
        pathname={pathname}
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
      />

      {/* Mobile top bar (visible on small screens) */}
      <MobileTopBar onOpen={() => setDrawerOpen(true)} />

      {/* Mobile slide-out drawer */}
      <MobileDrawer
        pathname={pathname}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  )
}
