'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
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
      <div className="rounded-xl border border-green-700/50 bg-green-900/20 p-4 text-center text-green-300 text-sm">
        Action submitted successfully.
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
    <div className="space-y-3">
      {error && (
        <p className="text-red-400 text-sm bg-red-900/20 border border-red-700/50 rounded-lg px-3 py-2">{error}</p>
      )}

      {!showDispute ? (
        <div className="flex gap-3">
          {canConfirm && (
            <Button
              onClick={handleConfirm}
              disabled={isPending}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white font-semibold"
            >
              {isPending ? 'Confirming…' : 'Confirm Result'}
            </Button>
          )}
          {canDispute && (
            <Button
              onClick={() => setShowDispute(true)}
              disabled={isPending}
              variant="outline"
              className="flex-1 border-red-700/50 text-red-400 hover:bg-red-900/20"
            >
              Dispute
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-red-700/30 bg-red-900/10 p-4">
          <p className="text-red-300 text-sm font-medium">Dispute this match result</p>
          <textarea
            value={disputeNote}
            onChange={(e) => setDisputeNote(e.target.value)}
            placeholder="What's incorrect? (optional)"
            maxLength={500}
            rows={3}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
          />
          <div className="flex gap-3">
            <Button
              onClick={handleDispute}
              disabled={isPending}
              className="flex-1 bg-red-700 hover:bg-red-600 text-white font-semibold"
            >
              {isPending ? 'Submitting…' : 'Submit Dispute'}
            </Button>
            <Button
              onClick={() => setShowDispute(false)}
              disabled={isPending}
              variant="outline"
              className="border-white/20 text-white/60"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
