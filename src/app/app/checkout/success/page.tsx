import Link from 'next/link'

export const metadata = { title: 'Booking Confirmed | Garrincha Active' }

export default function CheckoutSuccessPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center space-y-6">
      <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-green-600/20 border border-green-600/40">
        <svg className="h-10 w-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white">Booking Confirmed!</h1>
        <p className="mt-2 text-slate-400">Your payment was successful. See you on the court!</p>
      </div>
      <div className="flex flex-col gap-3">
        <Link href="/app/sessions" className="rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-green-500 transition-colors">
          View My Sessions
        </Link>
        <Link href="/app" className="rounded-xl border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-300 hover:border-slate-500 transition-colors">
          Go Home
        </Link>
      </div>
    </div>
  )
}
