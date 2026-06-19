import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import AppSidebar from '@/components/layout/app-sidebar'
import AppTopBar from '@/components/layout/app-top-bar'
import MobileBottomNav from '@/components/layout/mobile-bottom-nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-white">
      <AppSidebar user={user} />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Desktop top bar — hidden on mobile */}
        <div className="hidden lg:block shrink-0">
          <AppTopBar user={user} />
        </div>

        {/* Scrollable page content — pb-20 so content clears the mobile bottom nav */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation — hidden on desktop */}
      <MobileBottomNav />
    </div>
  )
}
