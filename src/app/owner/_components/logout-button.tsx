'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { logoutAction } from '@/app/app/_actions/logout'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await logoutAction()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
    >
      <LogOut className="h-3.5 w-3.5" />
      <span>Logout</span>
    </button>
  )
}
