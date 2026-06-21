import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { RewardCategory } from '@/generated/prisma'
import { cn, rewardCategoryLabel, formatDate } from '@/lib/utils'
import { CreateRewardDialog } from './CreateRewardDialog'

export const metadata: Metadata = { title: 'Rewards Management | Admin' }

// ─── Server Actions ────────────────────────────────────────────────────────────

async function toggleRewardActive(rewardId: string, currentActive: boolean) {
  'use server'
  await prisma.reward.update({ where: { id: rewardId }, data: { isActive: !currentActive } })
  revalidatePath('/admin/rewards')
}

async function createReward(formData: FormData) {
  'use server'
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const category = formData.get('category') as RewardCategory
  const pointsCost = parseInt(formData.get('pointsCost') as string, 10)
  const stock = parseInt(formData.get('stock') as string, 10)
  const centerId = (formData.get('centerId') as string) || null
  const sponsorId = (formData.get('sponsorId') as string) || null
  const expiresAtRaw = formData.get('expiresAt') as string
  await prisma.reward.create({
    data: {
      title, description, category, pointsCost,
      stock: isNaN(stock) ? 0 : stock,
      centerId: centerId || null,
      sponsorId: sponsorId || null,
      expiresAt: expiresAtRaw ? new Date(expiresAtRaw) : null,
      isActive: true,
    },
  })
  revalidatePath('/admin/rewards')
}

// ─── Category Badge ────────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: RewardCategory }) {
  const colors: Record<RewardCategory, string> = {
    DISCOUNT:         'bg-blue-900/40 text-blue-300 border-blue-700/50',
    MERCHANDISE:      'bg-purple-900/40 text-purple-300 border-purple-700/50',
    FREE_SESSION:     'bg-primary-fixed/10 text-primary-fixed border-primary-fixed/30',
    FOOD_DRINK:       'bg-orange-900/40 text-orange-300 border-orange-700/50',
    TOURNAMENT_ENTRY: 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30',
    SPONSOR_VOUCHER:  'bg-pink-900/40 text-pink-300 border-pink-700/50',
    VIP_ACCESS:       'bg-amber-900/40 text-amber-300 border-amber-700/50',
  }
  return (
    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', colors[category])}>
      {rewardCategoryLabel(category)}
    </span>
  )
}

// ─── Toggle Active Button ──────────────────────────────────────────────────────

function ToggleActiveForm({
  rewardId,
  isActive,
  toggleAction,
}: {
  rewardId: string
  isActive: boolean
  toggleAction: (rewardId: string, currentActive: boolean) => Promise<void>
}) {
  return (
    <form
      action={async () => {
        'use server'
        await toggleAction(rewardId, isActive)
      }}
    >
      <button
        type="submit"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
          isActive
            ? 'bg-primary-fixed/10 text-primary-fixed border border-primary-fixed/30 hover:bg-primary-fixed/20'
            : 'glass-card text-on-surface-variant border hover:bg-surface-container-high',
        )}
        title={isActive ? 'Click to deactivate' : 'Click to activate'}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', isActive ? 'bg-primary-fixed' : 'bg-on-surface-variant/40')} />
        {isActive ? 'Active' : 'Inactive'}
      </button>
    </form>
  )
}

// ─── Stats Bar ─────────────────────────────────────────────────────────────────

function StatsBar({ total, active, totalRedemptions }: { total: number; active: number; totalRedemptions: number }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: 'Total Rewards', value: total },
        { label: 'Active', value: active },
        { label: 'Total Redemptions', value: totalRedemptions },
      ].map(({ label, value }) => (
        <div key={label} className="glass-card rounded-xl px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">{label}</p>
          <p className="mt-1 text-2xl font-bold text-on-surface tabular-nums">{value.toLocaleString()}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminRewardsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'PLATFORM_ADMIN' && user.role !== 'CENTER_ADMIN') redirect('/app')

  const [rewards, centers, sponsors] = await Promise.all([
    prisma.reward.findMany({
      include: {
        center: { select: { id: true, name: true } },
        sponsor: { select: { id: true, name: true } },
        _count: { select: { redemptions: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.center.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.sponsor.findMany({ select: { id: true, name: true }, where: { isActive: true }, orderBy: { name: 'asc' } }),
  ])

  const totalRedemptions = rewards.reduce((sum, r) => sum + r._count.redemptions, 0)
  const activeCount = rewards.filter((r) => r.isActive).length

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Rewards</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Manage the rewards catalog — create, toggle, and edit rewards.</p>
        </div>
        <CreateRewardDialog centers={centers} sponsors={sponsors} createAction={createReward} />
      </div>

      <StatsBar total={rewards.length} active={activeCount} totalRedemptions={totalRedemptions} />

      {/* ── Table ── */}
      {rewards.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl glass-card py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-on-surface">No rewards yet</p>
          <p className="text-xs text-on-surface-variant">Create a reward to get started.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead>
                <tr className="bg-surface-container-lowest">
                  {['Title', 'Category', 'Points Cost', 'Stock', 'Center', 'Sponsor', 'Status', 'Redemptions', 'Expires', 'Actions'].map((col) => (
                    <th key={col} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-surface-container-lowest/40">
                {rewards.map((reward) => (
                  <tr key={reward.id} className="group transition-colors hover:bg-surface-container-high">
                    <td className="max-w-50 px-4 py-3">
                      <p className="truncate font-medium text-on-surface">{reward.title}</p>
                      <p className="mt-0.5 truncate text-xs text-on-surface-variant">
                        {reward.description.length > 60 ? reward.description.slice(0, 60) + '…' : reward.description}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3"><CategoryBadge category={reward.category} /></td>

                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-semibold text-[#FFD700] tabular-nums">{reward.pointsCost.toLocaleString()}</span>
                      <span className="ml-1 text-xs text-on-surface-variant">pts</span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={cn('tabular-nums font-medium', reward.stock === 0 ? 'text-error' : 'text-on-surface')}>
                        {reward.stock.toLocaleString()}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-on-surface-variant">
                      {reward.center?.name ?? <span className="text-on-surface-variant/30">—</span>}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-on-surface-variant">
                      {reward.sponsor?.name ?? <span className="text-on-surface-variant/30">—</span>}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      <ToggleActiveForm rewardId={reward.id} isActive={reward.isActive} toggleAction={toggleRewardActive} />
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-center tabular-nums text-on-surface">
                      {reward._count.redemptions}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-on-surface-variant">
                      {reward.expiresAt ? (
                        <span className={cn(reward.expiresAt < new Date() ? 'text-error' : 'text-on-surface-variant')}>
                          {formatDate(reward.expiresAt)}
                        </span>
                      ) : (
                        <span className="text-on-surface-variant/30">No expiry</span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      <Link
                        href={`/admin/rewards/${reward.id}/edit`}
                        className="glass-card inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-on-surface transition-colors hover:border-primary-fixed/40 hover:text-primary-fixed"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                        </svg>
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
