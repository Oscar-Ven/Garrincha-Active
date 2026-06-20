import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import OwnerSidebar from '@/components/layout/owner-sidebar'
import LogoutButton from './_components/logout-button'

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'OWNER') redirect('/app')

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-white">
      <OwnerSidebar />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <header className="hidden lg:flex h-14 shrink-0 items-center justify-between border-b border-amber-900/30 bg-slate-950/90 px-6 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
              👑 Owner Console
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden xl:block max-w-45 truncate text-xs text-slate-400">
              {user.email}
            </span>
            <LogoutButton />
          </div>
        </header>

        <main id="main-content" className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
