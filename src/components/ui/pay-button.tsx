'use client'

import { useTransition } from 'react'

export function PayButton({
  sessionId,
  price,
  description,
}: {
  sessionId: string
  price: number // in cents
  description: string
}) {
  const [pending, startTransition] = useTransition()

  function handlePay() {
    startTransition(async () => {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'session', referenceId: sessionId, priceAmount: price, description }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    })
  }

  return (
    <button
      type="button"
      onClick={handlePay}
      disabled={pending}
      className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60 transition-colors"
    >
      {pending ? 'Redirecting…' : `Pay €${(price / 100).toFixed(2)}`}
    </button>
  )
}
