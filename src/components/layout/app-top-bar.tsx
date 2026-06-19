'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, User, Settings, LogOut, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { SessionUser } from '@/lib/auth'
import { logoutAction } from '@/app/app/_actions/logout'

interface AppTopBarProps {
  user: SessionUser
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export default function AppTopBar({ user }: AppTopBarProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => {
      await logoutAction()
      router.push('/login')
    })
  }

  return (
    <header className="h-16 flex items-center justify-between border-b border-white/10 bg-slate-900/80 backdrop-blur-md px-6 gap-4">
      {/* Left: page context slot (empty; pages can use <title> or breadcrumbs) */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-400 truncate">
          Welcome back,{' '}
          <span className="font-semibold text-white">{user.name}</span>
        </p>
      </div>

      {/* Right: notification bell + avatar dropdown */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Notification bell */}
        <button
          type="button"
          aria-label="Notifications"
          className={cn(
            'relative rounded-full p-2 text-slate-400 transition-colors',
            'hover:bg-white/10 hover:text-white',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-500'
          )}
        >
          <Bell className="h-5 w-5" />
          {/* Unread indicator dot */}
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-green-500 ring-2 ring-slate-900"
          />
        </button>

        {/* Avatar + dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className={cn(
                'flex items-center gap-2 rounded-full pl-1 pr-2 py-1 transition-colors',
                'hover:bg-white/10',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-500'
              )}
            >
              <Avatar size="sm">
                <AvatarFallback className="bg-green-700 text-white text-xs font-bold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block max-w-[120px] truncate text-sm font-medium text-white leading-none">
                {user.name}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52 bg-slate-900 border-white/10 text-white">
            {/* User identity */}
            <DropdownMenuLabel className="text-slate-400">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-white truncate">{user.name}</span>
                <span className="text-xs text-slate-400 truncate">@{user.nickname}</span>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="bg-white/10" />

            {/* Nav items */}
            <DropdownMenuItem asChild>
              <Link
                href="/app/profile"
                className="flex items-center gap-2 text-slate-200 hover:!bg-white/10 hover:!text-white focus:!bg-white/10 focus:!text-white"
              >
                <User className="h-4 w-4 shrink-0" />
                Profile
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link
                href="/app/settings"
                className="flex items-center gap-2 text-slate-200 hover:!bg-white/10 hover:!text-white focus:!bg-white/10 focus:!text-white"
              >
                <Settings className="h-4 w-4 shrink-0" />
                Settings
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-white/10" />

            <DropdownMenuItem
              onSelect={handleLogout}
              disabled={isPending}
              className="flex items-center gap-2 text-red-400 hover:!bg-red-500/10 hover:!text-red-300 focus:!bg-red-500/10 focus:!text-red-300 cursor-pointer"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {isPending ? 'Signing out…' : 'Sign out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
