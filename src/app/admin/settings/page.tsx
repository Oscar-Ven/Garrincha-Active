import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { cn } from '@/lib/utils'
import {
  POINTS_RULES,
  SUSPICIOUS_SPEED_THRESHOLDS,
  LEVEL_THRESHOLDS,
  MAX_DAILY_ACTIVITY_POINTS,
} from '@/lib/points-rules'
import { ActivityType } from '@/generated/prisma'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Settings,
  Zap,
  Award,
  Users,
  Info,
  CheckCircle,
  Cpu,
  Database,
  AlertTriangle,
  Trash2,
  Plus,
  Bot,
  UserCheck,
} from 'lucide-react'
import { updatePlatformName, createBadge, deleteBadge } from './actions'

export const metadata = { title: 'Admin Settings' }

// ─── Layout helpers ───────────────────────────────────────────────────────────

function SectionCard({
  title,
  description,
  icon,
  children,
}: {
  title: string
  description?: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800/50 shadow-md">
      <div className="flex items-start gap-3 border-b border-slate-700 px-6 py-4">
        {icon && (
          <span className="mt-0.5 shrink-0 text-green-400">{icon}</span>
        )}
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-slate-400">{description}</p>
          )}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  )
}

function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-slate-700/60 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={cn('text-sm font-medium text-white', mono && 'font-mono text-xs bg-slate-900 px-2 py-0.5 rounded')}>
        {value}
      </span>
    </div>
  )
}

function AlertBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-yellow-700/50 bg-yellow-900/20 px-4 py-3 text-sm text-yellow-300">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

function SuccessBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-green-700/50 bg-green-900/20 px-4 py-3 text-sm text-green-300">
      <CheckCircle className="h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-red-700/50 bg-red-900/20 px-4 py-3 text-sm text-red-300">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

// ─── Activity type labels ────────────────────────────────────────────────────

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  RUN: 'Run',
  WALK: 'Walk',
  CYCLING: 'Cycling',
  FOOTBALL_TRAINING: 'Football Training',
  FOOTBALL_MATCH: 'Football Match',
  FITNESS: 'Fitness',
  CUSTOM: 'Custom',
}

const ACTIVITY_TYPE_UNIT: Record<ActivityType, string> = {
  RUN: 'pts / km',
  WALK: 'pts / km',
  CYCLING: 'pts / km',
  FOOTBALL_TRAINING: 'pts / session',
  FOOTBALL_MATCH: 'pts / match',
  FITNESS: 'pts / session',
  CUSTOM: 'pts / session',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const session = await getCurrentUser()
  if (!session) redirect('/login')
  if (session.role !== 'PLATFORM_ADMIN') redirect('/admin')

  const params = await searchParams
  const feedback = params.feedback
  const feedbackError = params.error

  // Fetch data in parallel
  const [platformNameSetting, badges, demoAccounts] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: 'platform_name' } }),
    prisma.badge.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { userBadges: true, challenges: true } } },
    }),
    prisma.user.findMany({
      where: {
        email: {
          in: [
            'admin@garrincha.app',
            'center@garrincha.app',
            'player@garrincha.app',
            'sponsor@garrincha.app',
          ],
        },
      },
      select: { id: true, email: true, name: true, role: true, isActive: true },
      orderBy: { role: 'asc' },
    }),
  ])

  const platformName = platformNameSetting?.value ?? 'Garrincha Active'

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Configure platform-wide defaults, inspect rules, and manage badges.
        </p>
      </div>

      {/* Feedback banners rendered from URL params (set by redirect after action) */}
      {feedback === 'platform_name_saved' && (
        <SuccessBanner>Platform name updated successfully.</SuccessBanner>
      )}
      {feedback === 'badge_created' && (
        <SuccessBanner>Badge created successfully.</SuccessBanner>
      )}
      {feedback === 'badge_deleted' && (
        <SuccessBanner>Badge deleted.</SuccessBanner>
      )}
      {feedbackError && (
        <ErrorBanner>{decodeURIComponent(feedbackError)}</ErrorBanner>
      )}

      {/* ── 1. Platform Name ──────────────────────────────────────────────── */}
      <SectionCard
        title="Platform Name"
        description="The display name used in headings, emails, and public-facing pages."
        icon={<Settings className="h-5 w-5" />}
      >
        <PlatformNameForm current={platformName} />
      </SectionCard>

      {/* ── 2. Points Rules ───────────────────────────────────────────────── */}
      <SectionCard
        title="Points Rules"
        description="Read-only display of the active point values defined in points-rules.ts. Edit the source file to change them."
        icon={<Zap className="h-5 w-5" />}
      >
        <div className="space-y-6">
          {/* Per-activity rates */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Activity Point Rates
            </h3>
            <div className="overflow-hidden rounded-lg border border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/60">
                    <th className="px-4 py-2.5 text-left font-medium text-slate-400">Activity Type</th>
                    <th className="px-4 py-2.5 text-right font-medium text-slate-400">Rate</th>
                    <th className="px-4 py-2.5 text-right font-medium text-slate-400">Max Speed (km/h)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {(Object.keys(POINTS_RULES) as ActivityType[]).map((type) => (
                    <tr key={type} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">
                        {ACTIVITY_TYPE_LABELS[type]}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-green-400">
                        {POINTS_RULES[type]} {ACTIVITY_TYPE_UNIT[type]}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400">
                        {SUSPICIOUS_SPEED_THRESHOLDS[type] !== null
                          ? `${SUSPICIOUS_SPEED_THRESHOLDS[type]} km/h`
                          : <span className="text-slate-600">N/A</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily cap + level thresholds */}
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Daily Cap
              </h3>
              <div className="rounded-lg border border-slate-700 px-4 py-3">
                <InfoRow
                  label="Max daily activity points"
                  value={
                    <span className="font-mono text-green-400">{MAX_DAILY_ACTIVITY_POINTS} pts</span>
                  }
                />
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Level Thresholds (lifetime points)
              </h3>
              <div className="rounded-lg border border-slate-700 divide-y divide-slate-700/60">
                {(Object.entries(LEVEL_THRESHOLDS) as [string, number][]).map(([level, pts]) => (
                  <div key={level} className="flex items-center justify-between px-4 py-2.5">
                    <span className={cn(
                      'text-sm font-semibold',
                      level === 'BRONZE' && 'text-amber-600',
                      level === 'SILVER' && 'text-slate-400',
                      level === 'GOLD' && 'text-yellow-500',
                      level === 'ELITE' && 'text-emerald-400',
                    )}>
                      {level}
                    </span>
                    <span className="font-mono text-sm text-white">{pts.toLocaleString()} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            To change any of the values above, update{' '}
            <code className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-slate-300">
              src/lib/points-rules.ts
            </code>{' '}
            and redeploy.
          </p>
        </div>
      </SectionCard>

      {/* ── 3. Badge Management ───────────────────────────────────────────── */}
      <SectionCard
        title="Badge Management"
        description="All badges defined in the platform. Auto badges are awarded automatically by the system; manual badges are granted by admins."
        icon={<Award className="h-5 w-5" />}
      >
        <div className="space-y-6">
          {/* Badge list */}
          {badges.length === 0 ? (
            <p className="text-sm text-slate-400">No badges defined yet. Create the first one below.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/60">
                    <th className="px-4 py-2.5 text-left font-medium text-slate-400">Badge</th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-400 hidden sm:table-cell">Key</th>
                    <th className="px-4 py-2.5 text-center font-medium text-slate-400">Type</th>
                    <th className="px-4 py-2.5 text-right font-medium text-slate-400">Awards</th>
                    <th className="px-4 py-2.5 text-right font-medium text-slate-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {badges.map((badge) => {
                    const canDelete =
                      badge._count.userBadges === 0 && badge._count.challenges === 0
                    return (
                      <tr key={badge.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {badge.iconUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={badge.iconUrl}
                                alt=""
                                className="h-8 w-8 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-slate-400">
                                <Award className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate">{badge.name}</p>
                              <p className="text-xs text-slate-400 truncate max-w-[180px]">
                                {badge.description}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <code className="rounded bg-slate-900 px-1.5 py-0.5 text-xs font-mono text-slate-300">
                            {badge.key}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {badge.isAuto ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-900/40 px-2.5 py-0.5 text-xs font-medium text-blue-300">
                              <Bot className="h-3 w-3" />
                              Auto
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-900/40 px-2.5 py-0.5 text-xs font-medium text-purple-300">
                              <UserCheck className="h-3 w-3" />
                              Manual
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-slate-300">
                            {badge._count.userBadges.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canDelete ? (
                            <DeleteBadgeForm badgeId={badge.id} badgeName={badge.name} />
                          ) : (
                            <span
                              className="text-xs text-slate-600"
                              title="Cannot delete — badge has been awarded or linked to challenges"
                            >
                              In use
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Create badge form */}
          <CreateBadgeForm />
        </div>
      </SectionCard>

      {/* ── 4. Demo Accounts ──────────────────────────────────────────────── */}
      <SectionCard
        title="Demo Accounts"
        description="Pre-seeded accounts for demonstration and testing. Do not use these credentials in production."
        icon={<Users className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <AlertBanner>
            These accounts exist for demo purposes only. Change or revoke their passwords before
            going live.
          </AlertBanner>

          {demoAccounts.length === 0 ? (
            <p className="text-sm text-slate-400">
              No standard demo accounts detected. Run{' '}
              <code className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-xs text-slate-300">
                npm run seed
              </code>{' '}
              to create them.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/60">
                    <th className="px-4 py-2.5 text-left font-medium text-slate-400">Name</th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-400">Email</th>
                    <th className="px-4 py-2.5 text-center font-medium text-slate-400">Role</th>
                    <th className="px-4 py-2.5 text-center font-medium text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {demoAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{account.name}</td>
                      <td className="px-4 py-3">
                        <code className="font-mono text-xs text-slate-300">{account.email}</code>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-medium',
                          account.role === 'PLATFORM_ADMIN' && 'bg-red-900/40 text-red-300',
                          account.role === 'CENTER_ADMIN' && 'bg-orange-900/40 text-orange-300',
                          account.role === 'SPONSOR_ADMIN' && 'bg-yellow-900/40 text-yellow-300',
                          account.role === 'PLAYER' && 'bg-blue-900/40 text-blue-300',
                        )}>
                          {account.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {account.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                            Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="rounded-lg border border-slate-700 bg-slate-900/40 px-4 py-3">
            <p className="text-xs text-slate-400">
              Default password for all demo accounts is{' '}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-300">
                password123
              </code>
              . Manage individual accounts via the{' '}
              <a href="/admin/players" className="text-green-400 underline hover:text-green-300">
                Players
              </a>{' '}
              page.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ── 5. System Info ────────────────────────────────────────────────── */}
      <SectionCard
        title="System Info"
        description="Runtime environment details for debugging and operations."
        icon={<Info className="h-5 w-5" />}
      >
        <div className="rounded-lg border border-slate-700 divide-y divide-slate-700/60">
          <InfoRow label="Node.js version" value={process.version} mono />
          <InfoRow label="Next.js version" value="16.2.9" mono />
          <InfoRow label="Prisma version" value="7.8" mono />
          <InfoRow
            label="Database"
            value={
              <span className="flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-slate-400" />
                SQLite — prisma/dev.db
              </span>
            }
          />
          <InfoRow label="Environment" value={process.env.NODE_ENV ?? 'development'} mono />
          <InfoRow
            label="App"
            value={
              <span className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-slate-400" />
                {platformName}
              </span>
            }
          />
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Platform Name Form (inline server action via redirect) ──────────────────

async function PlatformNameForm({ current }: { current: string }) {
  async function action(formData: FormData) {
    'use server'
    const { redirect } = await import('next/navigation')
    const result = await updatePlatformName(formData)
    if (result.error) {
      redirect(
        `/admin/settings?error=${encodeURIComponent(result.error)}`,
      )
    } else {
      redirect('/admin/settings?feedback=platform_name_saved')
    }
  }

  return (
    <form action={action} className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="platformName" className="text-sm font-medium text-slate-300">
          Platform Name
        </label>
        <div className="flex gap-3">
          <Input
            id="platformName"
            name="platformName"
            type="text"
            defaultValue={current}
            placeholder="Garrincha Active"
            maxLength={80}
            required
            className="max-w-sm"
          />
          <Button type="submit" size="md">
            Save
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          Stored in the{' '}
          <code className="rounded bg-slate-900 px-1 font-mono text-slate-400">app_settings</code>{' '}
          table under the key{' '}
          <code className="rounded bg-slate-900 px-1 font-mono text-slate-400">platform_name</code>.
        </p>
      </div>
    </form>
  )
}

// ─── Delete Badge Form ───────────────────────────────────────────────────────

async function DeleteBadgeForm({
  badgeId,
  badgeName,
}: {
  badgeId: string
  badgeName: string
}) {
  async function action() {
    'use server'
    const { redirect } = await import('next/navigation')
    const result = await deleteBadge(badgeId)
    if (result.error) {
      redirect(
        `/admin/settings?error=${encodeURIComponent(result.error)}#badge-management`,
      )
    } else {
      redirect('/admin/settings?feedback=badge_deleted#badge-management')
    }
  }

  return (
    <form action={action}>
      <button
        type="submit"
        title={`Delete badge "${badgeName}"`}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
          'border border-red-700/50 bg-red-900/20 text-red-400 hover:bg-red-900/40 hover:text-red-300',
          'focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-slate-800',
        )}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>
    </form>
  )
}

// ─── Create Badge Form ───────────────────────────────────────────────────────

async function CreateBadgeForm() {
  async function action(formData: FormData) {
    'use server'
    const { redirect } = await import('next/navigation')
    const result = await createBadge(formData)
    if (result.error) {
      redirect(
        `/admin/settings?error=${encodeURIComponent(result.error)}#badge-management`,
      )
    } else {
      redirect('/admin/settings?feedback=badge_created#badge-management')
    }
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Plus className="h-4 w-4 text-green-400" />
        <h3 className="text-sm font-semibold text-white">Create New Badge</h3>
      </div>

      <form action={action} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="badgeName" className="text-sm font-medium text-slate-300">
              Name <span className="text-red-400">*</span>
            </label>
            <Input
              id="badgeName"
              name="name"
              type="text"
              placeholder="First 5K Run"
              maxLength={80}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="badgeKey" className="text-sm font-medium text-slate-300">
              Key <span className="text-red-400">*</span>
            </label>
            <Input
              id="badgeKey"
              name="key"
              type="text"
              placeholder="first_5k_run"
              maxLength={60}
              required
            />
            <p className="text-xs text-slate-500">
              Lowercase letters, numbers, underscores only. Must be unique.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="badgeDescription" className="text-sm font-medium text-slate-300">
            Description <span className="text-red-400">*</span>
          </label>
          <textarea
            id="badgeDescription"
            name="description"
            rows={2}
            maxLength={200}
            placeholder="Awarded when a player completes their first 5 km run."
            required
            className={cn(
              'w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400',
              'focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600',
              'disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors duration-150',
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="badgeIconUrl" className="text-sm font-medium text-slate-300">
              Icon URL
            </label>
            <Input
              id="badgeIconUrl"
              name="iconUrl"
              type="url"
              placeholder="https://example.com/badges/first-5k.png"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-slate-300">Award Type</p>
            <div className="flex gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="isAuto"
                  value="true"
                  defaultChecked
                  className="h-4 w-4 accent-green-600"
                />
                <span className="flex items-center gap-1.5 text-sm text-slate-300">
                  <Bot className="h-3.5 w-3.5 text-blue-400" />
                  Automatic
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="isAuto"
                  value="false"
                  className="h-4 w-4 accent-green-600"
                />
                <span className="flex items-center gap-1.5 text-sm text-slate-300">
                  <UserCheck className="h-3.5 w-3.5 text-purple-400" />
                  Manual
                </span>
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Automatic badges are awarded by the system; manual badges are granted by admins.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button type="submit" size="md">
            <Plus className="h-4 w-4" />
            Create Badge
          </Button>
        </div>
      </form>
    </div>
  )
}
