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
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
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
    <div className="glass-card rounded-xl p-md">
      <h2 className="text-label-caps text-on-surface-variant mb-md">Connected Apps</h2>

      {/* OAuth result banners */}
      {justConnected && !connectError && (
        <div className="mb-md rounded-xl border border-primary-fixed/30 bg-primary-fixed/10 px-md py-sm text-label-caps text-primary-fixed">
          Strava connected successfully{athleteName ? ` as ${athleteName}` : ''}!
        </div>
      )}
      {connectError && (
        <div className="mb-md rounded-xl border border-error/30 bg-error/10 px-md py-sm text-label-caps text-error">
          {connectError}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md">
        <div className="flex items-center gap-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FC4C02] shrink-0">
            <StravaLogo className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-body-md font-bold text-on-surface">Strava</p>
            <p className="text-label-caps text-on-surface-variant">
              {isConnected
                ? athleteName
                  ? `Connected as ${athleteName}`
                  : 'Connected'
                : 'Import your running, cycling, and fitness activities'}
            </p>
          </div>
        </div>

        {isConnected ? (
          <div className="flex items-center gap-sm flex-wrap">
            <button
              onClick={handleImport}
              disabled={importState === 'loading'}
              className="rounded-xl bg-[#FC4C02] hover:bg-[#e04400] disabled:opacity-60 disabled:cursor-not-allowed px-md py-sm text-label-caps font-bold text-white transition-colors"
            >
              {importState === 'loading' ? 'Importing…' : 'Import Activities'}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={disconnectState === 'loading'}
              className="glass-card rounded-xl px-md py-sm text-label-caps font-bold text-on-surface-variant hover:text-error hover:border-error/30 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {disconnectState === 'loading' ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </div>
        ) : (
          <a
            href="/api/auth/strava"
            className="flex items-center gap-sm rounded-xl bg-[#FC4C02] hover:bg-[#e04400] px-md py-sm text-label-caps font-bold text-white transition-colors"
          >
            <StravaLogo className="h-4 w-4 text-white" />
            Connect Strava
          </a>
        )}
      </div>

      {/* Import result */}
      {importState === 'done' && importResult && (
        <div className="mt-md rounded-xl border border-primary-fixed/30 bg-primary-fixed/10 px-md py-sm text-label-caps text-primary-fixed">
          Imported {importResult.imported} new{' '}
          {importResult.imported === 1 ? 'activity' : 'activities'}.
          {importResult.skipped > 0 && ` ${importResult.skipped} already imported.`}
        </div>
      )}
      {importState === 'error' && importError && (
        <div className="mt-md rounded-xl border border-error/30 bg-error/10 px-md py-sm text-label-caps text-error">
          {importError}
        </div>
      )}
    </div>
  )
}
