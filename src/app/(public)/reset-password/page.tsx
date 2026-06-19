import { ResetPasswordForm } from './ResetPasswordForm'
import Link from 'next/link'
import { prisma } from '@/lib/db'

export const metadata = { title: 'Reset Password | Garrincha Active' }

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="text-center space-y-3">
          <p className="text-red-400 font-medium">Invalid or missing reset link.</p>
          <Link href="/forgot-password" className="text-green-400 text-sm hover:underline">
            Request a new one
          </Link>
        </div>
      </div>
    )
  }

  const user = await prisma.user.findFirst({
    where: { resetPasswordToken: token, resetPasswordExpires: { gt: new Date() } },
    select: { id: true },
  })

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="text-center space-y-3">
          <p className="text-red-400 font-medium">This link has expired or already been used.</p>
          <Link href="/forgot-password" className="text-green-400 text-sm hover:underline">
            Request a new one
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-3">🔐</div>
          <h1 className="text-2xl font-bold text-white">Set new password</h1>
          <p className="mt-1 text-sm text-slate-400">Choose a strong password for your account.</p>
        </div>
        <ResetPasswordForm token={token} />
      </div>
    </div>
  )
}
