'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Building2,
  BarChart3,
  Coins,
  Gift,
  Eye,
  ScrollText,
  Server,
  Settings,
  Crown,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Trophy,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Overview', href: '/owner', icon: LayoutDashboard },
  { label: 'Users', href: '/owner/users', icon: Users },
  { label: 'Analytics', href: '/owner/analytics', icon: BarChart3 },
  { label: 'Points Economy', href: '/owner/economy', icon: Coins },
  { label: 'Centers', href: '/owner/centers', icon: Building2 },
  { label: 'Rewards', href: '/owner/rewards', icon: Gift },
  { label: 'Moderation', href: '/owner/moderation', icon: Eye },
  { label: 'Audit Log', href: '/owner/audit', icon: ScrollText },
  { label: 'System Health', href: '/owner/system', icon: Server },
  { label: 'Settings', href: '/owner/settings', icon: Settings },
]

function isActive(pathname: string, href: string) {
  if (href === '/owner') return pathname === '/owner'
  return pathname === href || pathname.startsWith(href + '/')
}

function LogoMark({ className }: { className?: string }) {
  return <Crown className={cn('h-5 w-5', className)} />
}

function DesktopSidebar({
  pathname,
  collapsed,
  onToggle,
}: {
  pathname: string
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col h-screen sticky top-0 bg-slate-950 border-r border-amber-900/30 transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div
        className={cn(
          'flex items-center h-16 border-b border-amber-900/30 shrink-0',
          collapsed ? 'justify-center px-3' : 'justify-between px-4',
        )}
      >
        {!collapsed && (
          <Link
            href="/owner"
            className="flex items-center gap-2 text-white font-bold text-lg tracking-tight min-w-0"
          >
            <LogoMark className="text-amber-400 shrink-0" />
            <span className="truncate">
              Garrincha <span className="text-amber-400">Owner</span>
            </span>
          </Link>
        )}
        {collapsed && (
          <Link href="/owner" aria-label="Owner overview">
            <LogoMark className="text-amber-400" />
          </Link>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white',
            collapsed && 'hidden',
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

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

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-2 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-amber-600 text-white'
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

      <div className="border-t border-amber-900/30 p-3 shrink-0">
        {!collapsed ? (
          <p className="text-xs text-amber-900/80 text-center tracking-wide uppercase select-none font-semibold">
            Owner Console
          </p>
        ) : (
          <div className="flex justify-center">
            <Crown className="h-4 w-4 text-amber-900/60" />
          </div>
        )}
      </div>
    </aside>
  )
}

function MobileDrawer({
  pathname,
  open,
  onClose,
}: {
  pathname: string
  open: boolean
  onClose: () => void
}) {
  useEffect(() => { onClose() }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />
      <aside
        aria-label="Owner navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-950 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-amber-900/30 px-4 shrink-0">
          <Link
            href="/owner"
            className="flex items-center gap-2 text-white font-bold text-lg tracking-tight"
            onClick={onClose}
          >
            <Crown className="text-amber-400 h-5 w-5" />
            <span>Garrincha <span className="text-amber-400">Owner</span></span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-amber-900/30 p-4 shrink-0">
          <p className="text-xs text-amber-900/80 text-center tracking-wide uppercase font-semibold select-none">
            Owner Console
          </p>
        </div>
      </aside>
    </>
  )
}

function MobileTopBar({ onOpen }: { onOpen: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-amber-900/30 bg-slate-950/90 px-4 backdrop-blur-md lg:hidden">
      <button
        type="button"
        onClick={onOpen}
        className="rounded-md p-2 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>
      <Link href="/owner" className="flex items-center gap-1.5 text-base font-bold tracking-tight text-white">
        <Crown className="text-amber-400 h-4 w-4" />
        <span>Garrincha <span className="text-amber-400">Owner</span></span>
      </Link>
      <div className="w-9" aria-hidden="true" />
    </header>
  )
}

export default function OwnerSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <DesktopSidebar
        pathname={pathname}
        collapsed={collapsed}
        onToggle={() => setCollapsed((p) => !p)}
      />
      <MobileTopBar onOpen={() => setDrawerOpen(true)} />
      <MobileDrawer
        pathname={pathname}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  )
}
