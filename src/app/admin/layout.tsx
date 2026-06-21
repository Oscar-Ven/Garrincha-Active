import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import AdminSidebar from '@/components/layout/admin-sidebar'
import LogoutButton from './_components/logout-button'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'PLATFORM_ADMIN' && user.role !== 'CENTER_ADMIN') {
    redirect('/app')
  }

  const roleLabel =
    user.role === 'PLATFORM_ADMIN' ? 'Platform Admin' : 'Center Admin'

  const roleChipClass =
    user.role === 'PLATFORM_ADMIN'
      ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/40'
      : 'bg-green-600/20 text-green-400 border border-green-600/40'

  return (
    <div className="dark flex h-screen overflow-hidden bg-surface-container-lowest text-on-surface">
      {/* Sidebar: handles its own desktop + mobile rendering */}
      <AdminSidebar />

      {/* Main column */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top bar — desktop only (mobile top bar is rendered inside AdminSidebar) */}
        <header className="hidden lg:flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-surface-container/90 px-6 backdrop-blur-md">
          {/* Left: section title */}
          <h1 className="text-sm font-semibold tracking-wide text-white">
            Garrincha Admin
          </h1>

          {/* Right: role chip + email + logout */}
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleChipClass}`}
            >
              {roleLabel}
            </span>
            <span className="hidden xl:block max-w-45 truncate text-xs text-on-surface-variant">
              {user.email}
            </span>
            <LogoutButton />
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
