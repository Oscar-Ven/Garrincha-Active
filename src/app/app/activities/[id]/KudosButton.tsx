'use client'

import { useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toggleKudos } from '@/app/app/feed/actions'

interface KudosButtonProps {
  postId: string
  initialCount: number
  initiallyLiked: boolean
  currentUserId?: string
}

export function KudosButton({ postId, initialCount, initiallyLiked, currentUserId }: KudosButtonProps) {
  const [hasKudos, setHasKudos] = useState(initiallyLiked)
  const [count, setCount] = useState(initialCount)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!currentUserId) return
    const next = !hasKudos
    setHasKudos(next)
    setCount((c) => c + (next ? 1 : -1))
    startTransition(async () => { await toggleKudos(postId) })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!currentUserId || isPending}
      aria-label={hasKudos ? 'Remove kudos' : 'Give kudos'}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40',
        hasKudos
          ? 'border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
          : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500 hover:text-white',
      )}
    >
      <Heart className={cn('h-4 w-4 transition-all', hasKudos && 'fill-rose-400 stroke-rose-400')} />
      <span>{count > 0 ? count : ''} Kudos</span>
    </button>
  )
}
