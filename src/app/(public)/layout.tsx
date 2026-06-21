import Link from 'next/link'
import Navbar from '@/components/layout/navbar'
import { getCurrentUser } from '@/lib/auth'

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return (
    <>
      <Navbar session={user} />
      <main className="flex-1">
        {children}
      </main>
      <footer className="border-t border-white/8 bg-surface-container-lowest">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-fixed" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>sports_tennis</span>
              <span className="text-xs font-black italic tracking-tighter text-on-surface-variant">
                <span className="text-primary-fixed">GG</span> · Garrincha Active
              </span>
            </div>
            <nav className="flex items-center gap-6" aria-label="Footer navigation">
              <Link href="/terms" className="text-xs text-on-surface-variant transition-colors hover:text-on-surface">Terms</Link>
              <Link href="/privacy" className="text-xs text-on-surface-variant transition-colors hover:text-on-surface">Privacy</Link>
              <Link href="/cookies" className="text-xs text-on-surface-variant transition-colors hover:text-on-surface">Cookies</Link>
            </nav>
          </div>
        </div>
      </footer>
    </>
  )
}
