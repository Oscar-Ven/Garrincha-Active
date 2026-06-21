'use client'

import { useState, useTransition } from 'react'
import { confirmMatchAction, disputeMatchAction } from './actions'

interface Props {
  matchId: string
  canConfirm: boolean
  canDispute: boolean
}

export function MatchConfirmPanel({ matchId, canConfirm, canDispute }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [showDispute, setShowDispute] = useState(false)
  const [disputeNote, setDisputeNote] = useState('')

  if (done) {
    return (
      <div className="glass-card rounded-xl p-md text-center space-y-xs">
        <span
          className="material-symbols-outlined block text-primary-fixed"
          style={{ fontSize: '32px', fontVariationSettings: "'FILL' 1" }}
        >
          check_circle
        </span>
        <p className="text-label-caps text-primary-fixed">Action submitted successfully.</p>
      </div>
    )
  }

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await confirmMatchAction(matchId)
      if (result.error) setError(result.error)
      else setDone(true)
    })
  }

  function handleDispute() {
    setError(null)
    startTransition(async () => {
      const result = await disputeMatchAction(matchId, disputeNote || undefined)
      if (result.error) setError(result.error)
      else setDone(true)
    })
  }

  return (
    <div className="space-y-sm">
      {error && (
        <div className="glass-card rounded-xl p-sm border-l-4 border-l-error text-error text-body-md">
          {error}
        </div>
      )}

      {!showDispute ? (
        <div className="flex flex-col gap-sm">
          {canConfirm && (
            <button
              onClick={handleConfirm}
              disabled={isPending}
              className="w-full bg-primary-fixed text-on-primary-fixed py-4 rounded-xl font-bold text-label-caps action-glow hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-sm disabled:opacity-60 disabled:pointer-events-none"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              {isPending ? 'Confirming…' : 'Confirm Result'}
            </button>
          )}
          {canDispute && (
            <button
              onClick={() => setShowDispute(true)}
              disabled={isPending}
              className="border-2 border-error text-error py-3 rounded-xl font-bold text-label-caps hover:bg-error/10 active:scale-95 transition-all flex items-center justify-center gap-xs disabled:opacity-60 disabled:pointer-events-none"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>flag</span>
              Dispute
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-sm glass-card rounded-xl p-md border border-error/20">
          <p className="text-label-caps text-error">Dispute this match result</p>
          <textarea
            value={disputeNote}
            onChange={(e) => setDisputeNote(e.target.value)}
            placeholder="What&apos;s incorrect? (optional)"
            maxLength={500}
            rows={3}
            className="glass-card rounded-xl p-md w-full text-on-surface text-body-md bg-transparent border-none outline-none focus:ring-1 focus:ring-error resize-none placeholder:text-on-surface-variant"
          />
          <div className="flex gap-sm">
            <button
              onClick={handleDispute}
              disabled={isPending}
              className="flex-1 bg-primary-fixed text-on-primary-fixed py-3 rounded-xl font-bold text-label-caps action-glow hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-xs disabled:opacity-60 disabled:pointer-events-none"
            >
              {isPending ? 'Submitting…' : 'Submit Dispute'}
            </button>
            <button
              onClick={() => setShowDispute(false)}
              disabled={isPending}
              className="glass-card px-md py-3 rounded-xl font-bold text-label-caps text-on-surface-variant hover:text-on-surface active:scale-95 transition-all disabled:opacity-60 disabled:pointer-events-none"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
