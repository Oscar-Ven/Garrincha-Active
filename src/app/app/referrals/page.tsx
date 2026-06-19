import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import CopyButton from './copy-button'

export const metadata: Metadata = {
  title: 'Referrals',
  description: 'Invite friends and earn points when they join Garrincha Active.',
}

async function getReferralData(userId: string) {
  const [user, referrals] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    }),
    prisma.referral.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        referred: {
          select: { name: true, nickname: true, createdAt: true },
        },
      },
    }),
  ])
  return { referralCode: user?.referralCode ?? null, referrals }
}

export default async function ReferralsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { referralCode, referrals } = await getReferralData(user.id)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const inviteLink = referralCode ? `${appUrl}/register?ref=${referralCode}` : null

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Referrals</h1>
          <p className="mt-1 text-sm text-slate-400">
            Invite friends to join Garrincha Active and earn rewards together.
          </p>
        </div>

        {/* Explainer banner */}
        <div className="rounded-2xl border border-green-600/20 bg-green-600/10 p-6">
          <h2 className="text-base font-semibold text-green-400 mb-3">How it works</h2>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600/20 text-green-400 text-xs font-bold">1</span>
              Share your personal invite link with friends.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600/20 text-green-400 text-xs font-bold">2</span>
              When a friend registers using your link, you earn{' '}
              <span className="font-semibold text-green-400">100 pts</span>.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600/20 text-green-400 text-xs font-bold">3</span>
              Your friend also receives a{' '}
              <span className="font-semibold text-green-400">50 pt welcome bonus</span>.
            </li>
          </ul>
        </div>

        {/* Referral code + invite link */}
        {referralCode ? (
          <section aria-labelledby="code-heading" className="space-y-4">
            <h2 id="code-heading" className="text-lg font-semibold text-white">
              Your Referral Code
            </h2>

            {/* Code box */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3">
              <code className="flex-1 select-all font-mono text-lg font-bold tracking-widest text-green-400">
                {referralCode}
              </code>
              <CopyButton text={referralCode} label="Copy code" />
            </div>

            {/* Invite link box */}
            {inviteLink && (
              <div className="space-y-2">
                <p className="text-sm text-slate-400">Or share your invite link directly:</p>
                <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3">
                  <span className="flex-1 truncate font-mono text-sm text-slate-300 select-all">
                    {inviteLink}
                  </span>
                  <CopyButton text={inviteLink} label="Copy link" />
                </div>
              </div>
            )}
          </section>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/40 p-6 text-center">
            <p className="text-sm text-slate-500">Your referral code is being generated.</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 text-center">
            <p className="text-3xl font-extrabold text-white tabular-nums">
              {referrals.length}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {referrals.length === 1 ? 'Friend' : 'Friends'} referred
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 text-center">
            <p className="text-3xl font-extrabold text-green-400 tabular-nums">
              {(referrals.filter((r) => r.pointsAwarded).length * 100).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-400">Points earned</p>
          </div>
        </div>

        {/* Referred users list */}
        <section aria-labelledby="referred-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="referred-heading" className="text-lg font-semibold text-white">
              Referred Friends
            </h2>
            <span className="text-sm text-slate-500">
              {referrals.length} {referrals.length === 1 ? 'person' : 'people'}
            </span>
          </div>

          {referrals.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-700 bg-slate-800/40 px-6 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-700 text-2xl">
                👥
              </div>
              <div>
                <p className="font-semibold text-slate-200">No referrals yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Share your invite link to start earning referral points.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-slate-700/60 rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
              {referrals.map((referral) => (
                <li
                  key={referral.id}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-slate-300">
                    {referral.referred.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-100">
                      {referral.referred.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      @{referral.referred.nickname} &middot; Joined {formatDate(referral.referred.createdAt)}
                    </p>
                  </div>
                  {referral.pointsAwarded ? (
                    <span className="shrink-0 rounded-md bg-green-600/15 px-2 py-0.5 text-xs font-semibold text-green-400 ring-1 ring-green-600/20">
                      +100 pts
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-md bg-slate-700/60 px-2 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-600/20">
                      Pending
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
    </div>
  )
}
