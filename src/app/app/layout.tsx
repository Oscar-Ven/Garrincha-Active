import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import AppSidebar from '@/components/layout/app-sidebar'
import AppTopBar from '@/components/layout/app-top-bar'
import MobileBottomNav from '@/components/layout/mobile-bottom-nav'
import StitchAppTopBar from '@/components/layout/stitch-app-topbar'
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
    <div className="dark flex h-screen overflow-hidden bg-surface-container-lowest text-on-surface">
      <PushSetup />

      {/* Desktop sidebar — hidden on mobile */}
      <AppSidebar user={user} />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Stitch fixed top bar — mobile only */}
        <StitchAppTopBar unreadCount={unreadCount} className="lg:hidden" />

        {/* Desktop top bar — hidden on mobile */}
        <div className="hidden lg:block shrink-0">
          <AppTopBar user={user} unreadCount={unreadCount} />
        </div>

        {/* Scrollable page content */}
        <main id="main-content" className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-margin-mobile pt-20 pb-32 lg:px-8 lg:pt-6 lg:pb-8">
            {/* Desktop search bar */}
            <div className="mb-4 hidden lg:block">
              <GlobalSearch />
            </div>
            {children}
          </div>
        </main>
      </div>

      {/* Stitch bottom nav — mobile only */}
      <MobileBottomNav />
    </div>
  )
}
