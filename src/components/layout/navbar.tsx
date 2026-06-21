'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { SessionUser } from '@/lib/auth'

interface NavbarProps {
  session?: SessionUser | null
}

const NAV_LINKS = [
  { label: 'Features', href: '/features' },
  { label: 'Challenges', href: '/challenges' },
  { label: 'Rewards', href: '/rewards' },
  { label: 'Events', href: '/events' },
]

export default function Navbar({ session }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/8 bg-surface-container-lowest/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-black italic tracking-tighter text-white text-xl">
          <span className="material-symbols-outlined text-[#c3f400]" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>
            sports_tennis
          </span>
          <span className="text-[#c3f400]">GG</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-white/8 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop auth */}
        <div className="hidden items-center gap-3 md:flex">
          {session ? (
            <Link
              href="/app"
              className="bg-[#c3f400] text-on-primary-fixed font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-lg transition-all hover:scale-105 active:scale-95"
              style={{ boxShadow: '0 0 16px rgba(195,244,0,0.25)' }}
            >
              Open App
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-white/8 hover:text-white"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="bg-[#c3f400] text-on-primary-fixed font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-lg transition-all hover:scale-105 active:scale-95"
                style={{ boxShadow: '0 0 16px rgba(195,244,0,0.25)' }}
              >
                Register
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex items-center justify-center rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-white/8 hover:text-white md:hidden"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
            {menuOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out md:hidden',
          menuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="border-t border-white/8 bg-surface-container-lowest px-4 pb-4 pt-2">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-white/8 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-2 border-t border-white/8 pt-3">
            {session ? (
              <Link
                href="/app"
                onClick={() => setMenuOpen(false)}
                className="bg-[#c3f400] text-on-primary-fixed font-bold text-xs uppercase tracking-widest px-4 py-3 rounded-lg text-center transition-all active:scale-95"
              >
                Open App
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg border border-white/20 px-4 py-3 text-center text-xs font-bold uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-white/8 hover:text-white"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="bg-[#c3f400] text-on-primary-fixed font-bold text-xs uppercase tracking-widest px-4 py-3 rounded-lg text-center transition-all active:scale-95"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
