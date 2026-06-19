'use client'

import { useState } from 'react'

interface StravaSectionProps {
  stravaAccountId: string | null
  athleteName: string | null
  justConnected: boolean
  connectError: string | null
}

function StravaLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  )
}

export default function StravaSection({
  stravaAccountId,
  athleteName,
  justConnected,
  connectError,
}: StravaSectionProps) {
  const [importState, setImportState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [disconnectState, setDisconnectState] = useState<'idle' | 'loading'>('idle')

  const isConnected = stravaAccountId !== null

  async function handleImport() {
    setImportState('loading')
    setImportError(null)
    try {
      const res = await fetch('/api/strava/import', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setImportError(data.error ?? 'Import failed.')
        setImportState('error')
      } else {
        setImportResult(data)
        setImportState('done')
      }
    } catch {
      setImportError('Network error. Please try again.')
      setImportState('error')
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect Strava? Your imported activities will remain.')) return
    setDisconnectState('loading')
    try {
      const res = await fetch('/api/auth/strava/disconnect', { method: 'POST' })
      if (res.ok) {
        // Reload to reflect disconnected state
        window.location.reload()
      } else {
        alert('Failed to disconnect Strava. Please try again.')
        setDisconnectState('idle')
      }
    } catch {
      alert('Network error. Please try again.')
      setDisconnectState('idle')
    }
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
        Connected Apps
      </h2>

      {/* Success / error banners from OAuth redirect */}
      {justConnected && !connectError && (
        <div className="mb-4 rounded-lg border border-green-700 bg-green-900/30 px-4 py-3 text-sm text-green-300">
          Strava connected successfully{athleteName ? ` as ${athleteName}` : ''}!
        </div>
      )}
      {connectError && (
        <div className="mb-4 rounded-lg border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {connectError}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FC4C02]">
            <StravaLogo className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-medium text-white">Strava</p>
            <p className="text-xs text-slate-400">
              {isConnected
                ? athleteName
                  ? `Connected as ${athleteName}`
                  : 'Connected'
                : 'Import your running, cycling, and fitness activities'}
            </p>
          </div>
        </div>

        {isConnected ? (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Import Activities */}
            <button
              onClick={handleImport}
              disabled={importState === 'loading'}
              className="rounded-lg bg-[#FC4C02] hover:bg-[#e04400] disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white transition-colors"
            >
              {importState === 'loading' ? 'Importing…' : 'Import Activities'}
            </button>
            {/* Disconnect */}
            <button
              onClick={handleDisconnect}
              disabled={disconnectState === 'loading'}
              className="rounded-lg border border-slate-600 hover:border-red-500 hover:text-red-400 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-slate-300 transition-colors"
            >
              {disconnectState === 'loading' ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </div>
        ) : (
          <a
            href="/api/auth/strava"
            className="flex items-center gap-2 rounded-lg bg-[#FC4C02] hover:bg-[#e04400] px-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            <StravaLogo className="h-4 w-4 text-white" />
            Connect Strava
          </a>
        )}
      </div>

      {/* Import result */}
      {importState === 'done' && importResult && (
        <div className="mt-4 rounded-lg border border-green-700 bg-green-900/30 px-4 py-3 text-sm text-green-300">
          Imported {importResult.imported} new{' '}
          {importResult.imported === 1 ? 'activity' : 'activities'}.
          {importResult.skipped > 0 && ` ${importResult.skipped} already imported.`}
        </div>
      )}
      {importState === 'error' && importError && (
        <div className="mt-4 rounded-lg border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {importError}
        </div>
      )}
    </div>
  )
}
