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
      <footer className="border-t border-white/10 bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-slate-400">
              &copy; 2025 Garrincha Active. All rights reserved.
            </p>
            <nav className="flex items-center gap-6" aria-label="Footer navigation">
              <Link
                href="/terms"
                className="text-sm text-slate-400 transition-colors hover:text-white"
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-slate-400 transition-colors hover:text-white"
              >
                Privacy
              </Link>
              <Link
                href="/cookies"
                className="text-sm text-slate-400 transition-colors hover:text-white"
              >
                Cookies
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </>
  )
}
