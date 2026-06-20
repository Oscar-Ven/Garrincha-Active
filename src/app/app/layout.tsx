import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import AppSidebar from '@/components/layout/app-sidebar'
import AppTopBar from '@/components/layout/app-top-bar'
import MobileBottomNav from '@/components/layout/mobile-bottom-nav'
import { PushSetup } from '@/components/push-setup'
import { GlobalSearch } from '@/components/global-search'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  })

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-white">
      <PushSetup />
      <AppSidebar user={user} />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Desktop top bar — hidden on mobile */}
        <div className="hidden lg:block shrink-0">
          <AppTopBar user={user} unreadCount={unreadCount} />
        </div>

        {/* Scrollable page content */}
        <main id="main-content" className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-8">
            {/* Mobile search bar — desktop uses the top bar */}
            <div className="mb-4 lg:hidden">
              <GlobalSearch />
            </div>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation — hidden on desktop */}
      <MobileBottomNav />
    </div>
  )
}
