import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { cn } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

export const metadata = { title: 'Settings — Admin' }

// ─── Server Actions ────────────────────────────────────────────────────────────

async function createBadge(formData: FormData) {
  'use server'
  const admin = await getCurrentUser()
  if (!admin || admin.role !== 'PLATFORM_ADMIN') throw new Error('Unauthorized')
  const key         = (formData.get('key') as string).trim()
  const name        = (formData.get('name') as string).trim()
  const description = (formData.get('description') as string).trim()
  const iconUrl     = (formData.get('iconUrl') as string | null)?.trim() || null
  if (!key || !name || !description) throw new Error('Missing required fields')
  await prisma.badge.create({ data: { key, name, description, iconUrl } })
  revalidatePath('/admin/settings')
}

async function deleteBadge(formData: FormData) {
  'use server'
  const admin = await getCurrentUser()
  if (!admin || admin.role !== 'PLATFORM_ADMIN') throw new Error('Unauthorized')
  await prisma.badge.delete({ where: { id: formData.get('badgeId') as string } })
  revalidatePath('/admin/settings')
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="glass-card overflow-hidden rounded-xl">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <span className="material-symbols-outlined text-primary-fixed" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        <h2 className="text-base font-semibold text-on-surface">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 py-3 last:border-0">
      <p className="text-sm font-medium text-on-surface-variant">{label}</p>
      {mono ? (
        <code className="rounded bg-surface-container-lowest px-2 py-0.5 font-mono text-xs text-on-surface">{value}</code>
      ) : (
        <p className="text-sm text-on-surface">{value}</p>
      )}
    </div>
  )
}

function AlertBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[#FFD700]/30 bg-[#FFD700]/10 px-4 py-3">
      <span className="material-symbols-outlined mt-0.5 shrink-0 text-[#FFD700]" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>warning</span>
      <p className="text-sm text-[#FFD700]">{message}</p>
    </div>
  )
}

function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-primary-fixed/30 bg-primary-fixed/10 px-4 py-3">
      <span className="material-symbols-outlined mt-0.5 shrink-0 text-primary-fixed" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
      <p className="text-sm text-primary-fixed">{message}</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminSettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'PLATFORM_ADMIN') redirect('/app')

  const [badges, systemStats, demoAccounts] = await Promise.all([
    prisma.badge.findMany({ orderBy: { name: 'asc' } }),
    prisma.$transaction([
      prisma.user.count(),
      prisma.activity.count(),
      prisma.rewardRedemption.count(),
      prisma.badge.count(),
    ]),
    prisma.user.findMany({
      where: { email: { contains: '@demo.' } },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  const [userCount, activityCount, redemptionCount, badgeCount] = systemStats

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed/10">
          <span className="material-symbols-outlined text-primary-fixed" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>settings</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Platform Settings</h1>
          <p className="text-sm text-on-surface-variant">Manage platform configuration, badges, and system data.</p>
        </div>
      </div>

      {/* ── System info ── */}
      <SectionCard title="System Overview" icon="dns">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Users',       value: userCount },
            { label: 'Total Activities',  value: activityCount },
            { label: 'Total Redemptions', value: redemptionCount },
            { label: 'Total Badges',      value: badgeCount },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-white/10 px-4 py-3">
              <p className="text-xs text-on-surface-variant">{label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-on-surface">{value.toLocaleString()}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 divide-y divide-white/10 border-t border-white/10">
          <InfoRow label="Node.js"  value={process.version}                                     mono />
          <InfoRow label="Env"      value={process.env.NODE_ENV ?? 'unknown'}                   />
          <InfoRow label="Vercel"   value={process.env.VERCEL_ENV ?? 'local'}                   />
          <InfoRow label="Version"  value={process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev'}        />
        </div>
      </SectionCard>

      {/* ── Badges ── */}
      <SectionCard title="Badges" icon="military_tech">
        <div className="space-y-4">
          <AlertBanner message="Deleting a badge that has already been awarded to players will also remove it from their profiles." />

          {/* Existing badges table */}
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-surface-container">
                  {['Key', 'Name', 'Description', 'Auto?', 'Actions'].map((col) => (
                    <th key={col} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {badges.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-on-surface-variant">
                      No badges created yet.
                    </td>
                  </tr>
                ) : (
                  badges.map((badge) => (
                    <tr key={badge.id} className="transition-colors hover:bg-surface-container-high">
                      <td className="px-4 py-3">
                        <code className="rounded bg-surface-container-lowest px-2 py-0.5 font-mono text-xs text-on-surface">{badge.key}</code>
                      </td>
                      <td className="px-4 py-3 font-medium text-on-surface">{badge.name}</td>
                      <td className="max-w-56 px-4 py-3">
                        <p className="line-clamp-2 text-xs text-on-surface-variant">{badge.description}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">
                        {badge.isAuto ? 'Auto' : 'Manual'}
                      </td>
                      <td className="px-4 py-3">
                        <form action={deleteBadge}>
                          <input type="hidden" name="badgeId" value={badge.id} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 rounded-lg border border-error/40 bg-error/10 px-2.5 py-1 text-xs font-semibold text-error transition-colors hover:bg-error/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>delete</span>
                            Delete
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Create badge form */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="mb-4 text-sm font-semibold text-on-surface">Create New Badge</h3>
            <form action={createBadge} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-on-surface-variant">Key * (unique identifier)</label>
                  <input
                    name="key"
                    required
                    placeholder="e.g. speed_demon"
                    className="glass-card w-full rounded-lg border px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary-fixed focus:outline-none focus:ring-1 focus:ring-primary-fixed"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-on-surface-variant">Display Name *</label>
                  <input
                    name="name"
                    required
                    placeholder="e.g. Speed Demon"
                    className="glass-card w-full rounded-lg border px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary-fixed focus:outline-none focus:ring-1 focus:ring-primary-fixed"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-on-surface-variant">Icon URL</label>
                  <input
                    name="iconUrl"
                    type="url"
                    placeholder="https://…"
                    className="glass-card w-full rounded-lg border px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary-fixed focus:outline-none focus:ring-1 focus:ring-primary-fixed"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-on-surface-variant">Description *</label>
                <textarea
                  name="description"
                  required
                  rows={3}
                  placeholder="Describe when this badge is awarded…"
                  className="glass-card w-full resize-none rounded-lg border px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary-fixed focus:outline-none focus:ring-1 focus:ring-primary-fixed"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-fixed px-4 py-2 text-sm font-semibold text-on-primary-fixed transition-colors hover:bg-primary-fixed-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>add</span>
                  Create Badge
                </button>
              </div>
            </form>
          </div>
        </div>
      </SectionCard>

      {/* ── Demo accounts ── */}
      {demoAccounts.length > 0 && (
        <SectionCard title="Demo Accounts" icon="smart_toy">
          <SuccessBanner message="Demo accounts are sandbox users used for testing. They have the email domain @demo.*" />
          <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-surface-container">
                  {['Name', 'Email', 'Role', 'Created'].map((col) => (
                    <th key={col} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {demoAccounts.map((acc) => (
                  <tr key={acc.id} className="transition-colors hover:bg-surface-container-high">
                    <td className="px-4 py-3 font-medium text-on-surface">{acc.name}</td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-surface-container-lowest px-2 py-0.5 font-mono text-xs text-on-surface">
                        {acc.email}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{acc.role}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-on-surface-variant">
                      {new Date(acc.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* ── Verified user model ── */}
      <SectionCard title="Verified Users" icon="verified_user">
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>Verified users have completed identity verification. Verification grants access to competitive features and removes moderation limitations.</p>
          <div className="divide-y divide-white/10 border-t border-white/10">
            <InfoRow label="Verification provider" value="Manual review" />
            <InfoRow label="Auto-verify on"         value="Email + phone confirmed" />
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
