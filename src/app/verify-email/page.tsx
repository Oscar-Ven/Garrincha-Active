import { prisma } from '@/lib/db'
import { sendWelcomeEmail } from '@/services/email-service'
import Link from 'next/link'

export const metadata = { title: 'Verify Email | Garrincha Active' }

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    return <Result ok={false} message="Invalid verification link." />
  }

  const user = await prisma.user.findFirst({
    where: { emailVerifyToken: token, emailVerified: null },
    select: { id: true, email: true, name: true },
  })

  if (!user) {
    return <Result ok={false} message="This link has already been used or is invalid." />
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date(), emailVerifyToken: null },
  })

  await sendWelcomeEmail(user.email, user.name)

  return <Result ok={true} message="Your email has been verified!" />
}

function Result({ ok, message }: { ok: boolean; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="text-center space-y-4">
        <div className="text-5xl">{ok ? '✅' : '❌'}</div>
        <p className={`font-semibold text-lg ${ok ? 'text-green-300' : 'text-red-400'}`}>{message}</p>
        {ok && (
          <p className="text-slate-400 text-sm">Check your inbox for a welcome email from us.</p>
        )}
        <Link
          href={ok ? '/app' : '/login'}
          className="inline-block mt-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
        >
          {ok ? 'Go to Dashboard' : 'Back to Login'}
        </Link>
      </div>
    </div>
  )
}
