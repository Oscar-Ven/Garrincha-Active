'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export default function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select the text
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
        copied
          ? 'bg-green-600/20 text-green-400 ring-1 ring-green-600/30'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white',
      )}
      aria-label={label}
    >
      {copied ? 'Copied!' : label}
    </button>
  )
}
