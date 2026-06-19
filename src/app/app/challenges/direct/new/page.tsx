import { Suspense } from 'react'
import NewDirectChallengeForm from './form'

export const metadata = { title: 'New 1v1 Challenge | Garrincha Active' }

export default function NewDirectChallengePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <NewDirectChallengeForm />
    </Suspense>
  )
}
