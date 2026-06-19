import { ForgotPasswordForm } from './ForgotPasswordForm'
import Link from 'next/link'

export const metadata = { title: 'Forgot Password | Garrincha Active' }

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-3">⚽</div>
          <h1 className="text-2xl font-bold text-white">Forgot your password?</h1>
          <p className="mt-1 text-sm text-slate-400">
            Enter your email and we&apos;ll send a reset link.
          </p>
        </div>
        <ForgotPasswordForm />
        <p className="text-center text-sm text-slate-500">
          Remember it?{' '}
          <Link href="/login" className="text-green-400 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  )
}
