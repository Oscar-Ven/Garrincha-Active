'use client'

import { useState } from 'react'
import QRCode from 'react-qr-code'

export function QRCodeDisplay({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR code on white background so it scans correctly */}
      <div className="rounded-2xl bg-white p-4 shadow-lg">
        <QRCode value={value} size={180} />
      </div>

      {label && <p className="text-xs font-medium text-slate-400">{label}</p>}

      {/* Redemption code text */}
      <div className="flex w-full items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
        <code className="flex-1 break-all font-mono text-base font-bold tracking-widest text-green-300">
          {value}
        </code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-400 hover:text-white transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
