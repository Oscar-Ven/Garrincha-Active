'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems: { label: string; href: string; icon: string }[] = [
  { label: 'Overview',    href: '/admin',                  icon: 'dashboard' },
  { label: 'Players',     href: '/admin/players',          icon: 'group' },
  { label: 'Centers',     href: '/admin/centers',          icon: 'location_city' },
  { label: 'Activities',  href: '/admin/activities',       icon: 'bolt' },
  { label: 'Segments',    href: '/admin/segments',         icon: 'flag' },
  { label: 'Routes',      href: '/admin/routes',           icon: 'map' },
  { label: 'Rewards',     href: '/admin/rewards',          icon: 'redeem' },
  { label: 'Auctions',    href: '/admin/rewards/auctions', icon: 'gavel' },
  { label: 'Redemptions', href: '/admin/redemptions',      icon: 'confirmation_number' },
  { label: 'Challenges',  href: '/admin/challenges',       icon: 'emoji_events' },
  { label: 'Events',      href: '/admin/events',           icon: 'event' },
  { label: 'Sessions',    href: '/admin/sessions',         icon: 'event_available' },
  { label: 'Memberships', href: '/admin/memberships',      icon: 'credit_card' },
  { label: 'Courts',      href: '/admin/courts',           icon: 'location_on' },
  { label: 'Teams',       href: '/admin/teams',            icon: 'shield' },
  { label: 'Sponsors',    href: '/admin/sponsors',         icon: 'grade' },
  { label: 'Moderation',  href: '/admin/moderation',       icon: 'visibility' },
  { label: 'Reports',     href: '/admin/reports',          icon: 'bar_chart' },
  { label: 'Settings',    href: '/admin/settings',         icon: 'settings' },
]

function isRouteActive(pathname: string, href: string): boolean {
  if (href === '/admin') {
    return pathname === '/admin'
  }
  return pathname === href || pathname.startsWith(href + '/')
}

// ─── Logo Mark ────────────────────────────────────────────────────────────────

function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn('material-symbols-outlined', className)}
      style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
    >
      bolt
    </span>
  )
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
        'hidden lg:flex flex-col h-screen sticky top-0 bg-surface-container-lowest border-r border-white/10 transition-all duration-300 ease-in-out',
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
            className="flex items-center gap-2 text-on-surface font-bold text-lg tracking-tight min-w-0"
          >
            <LogoMark className="text-primary-fixed shrink-0" />
            <span className="truncate">
              Garrincha <span className="text-primary-fixed">Admin</span>
            </span>
          </Link>
        )}
        {collapsed && (
          <Link href="/admin" aria-label="Admin overview">
            <LogoMark className="text-primary-fixed" />
          </Link>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'shrink-0 rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-white/10 hover:text-on-surface',
            collapsed && 'hidden'
          )}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_left</span>
        </button>
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Expand sidebar"
          className="mx-auto mt-2 rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-white/10 hover:text-on-surface"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
        </button>
      )}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map(({ label, href, icon }) => {
          const active = isRouteActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-2 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary-fixed/10 text-primary-fixed'
                  : 'text-on-surface-variant hover:bg-white/10 hover:text-on-surface',
                collapsed && 'justify-center px-2'
              )}
            >
              <span
                className="material-symbols-outlined shrink-0"
                style={{ fontSize: '20px', fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
              >
                {icon}
              </span>
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom branding strip */}
      <div className="border-t border-white/10 p-3 shrink-0">
        {!collapsed && (
          <p className="text-xs text-on-surface-variant text-center tracking-wide uppercase select-none">
            Platform Admin
          </p>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <LogoMark className="text-on-surface-variant opacity-40" />
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
  useEffect(() => {
    onClose()
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

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
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-surface-container-lowest shadow-2xl transition-transform duration-300 ease-in-out lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4 shrink-0">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-on-surface font-bold text-lg tracking-tight"
            onClick={onClose}
          >
            <LogoMark className="text-primary-fixed" />
            <span>
              Garrincha <span className="text-primary-fixed">Admin</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-white/10 hover:text-on-surface"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map(({ label, href, icon }) => {
            const active = isRouteActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary-fixed/10 text-primary-fixed'
                    : 'text-on-surface-variant hover:bg-white/10 hover:text-on-surface'
                )}
              >
                <span
                  className="material-symbols-outlined shrink-0"
                  style={{ fontSize: '20px', fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {icon}
                </span>
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom branding strip */}
        <div className="border-t border-white/10 p-4 shrink-0">
          <p className="text-xs text-on-surface-variant text-center tracking-wide uppercase select-none">
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
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-surface-container-lowest/90 px-4 backdrop-blur-md lg:hidden">
      <button
        type="button"
        onClick={onOpen}
        aria-label="Open navigation"
        className="rounded-md p-2 text-on-surface-variant transition-colors hover:bg-white/10 hover:text-on-surface"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>menu</span>
      </button>
      <Link
        href="/admin"
        className="flex items-center gap-1.5 text-base font-bold tracking-tight text-on-surface"
      >
        <LogoMark className="text-primary-fixed" />
        <span>
          Garrincha <span className="text-primary-fixed">Admin</span>
        </span>
      </Link>
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
      <DesktopSidebar
        pathname={pathname}
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
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
