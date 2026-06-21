import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getDashboardStats } from '@/services/admin'
import { StatCard } from '@/components/ui/stat-card'
import { cn, activityTypeLabel, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { ReactNode } from 'react'

export const metadata = { title: 'Admin Dashboard — Garrincha Active' }

async function getRecentActivities() {
  return prisma.activity.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      pointsEarned: true,
      durationMinutes: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          nickname: true,
          avatarUrl: true,
        },
      },
    },
  })
}

function ActivityStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    APPROVED: { label: 'Approved', className: 'bg-primary-fixed/10 text-primary-fixed border border-primary-fixed/20' },
    PENDING:  { label: 'Pending',  className: 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20' },
    FLAGGED:  { label: 'Flagged',  className: 'bg-error/10 text-error border border-error/20' },
    REJECTED: { label: 'Rejected', className: 'bg-white/5 text-on-surface-variant border border-white/10' },
  }

  const { label, className } = config[status] ?? {
    label: status,
    className: 'bg-white/5 text-on-surface-variant',
  }

  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-label-caps', className)}>
      {label}
    </span>
  )
}

interface QuickLinkProps {
  href: string
  icon: string
  label: string
  description: string
}

function QuickLink({ href, icon, label, description }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="glass-card group flex items-center gap-md rounded-xl p-md transition-colors hover:bg-surface-container-high active:scale-[0.99]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-fixed/10">
        <span
          className="material-symbols-outlined text-primary-fixed"
          style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-body-md font-bold text-on-surface">{label}</p>
        <p className="text-label-caps text-on-surface-variant truncate">{description}</p>
      </div>
      <span className="material-symbols-outlined text-on-surface-variant shrink-0" style={{ fontSize: '18px' }}>
        chevron_right
      </span>
    </Link>
  )
}

function icon(name: string): ReactNode {
  return (
    <span
      className="material-symbols-outlined"
      style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
    >
      {name}
    </span>
  )
}

export default async function AdminOverviewPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'PLATFORM_ADMIN' && user.role !== 'CENTER_ADMIN') redirect('/app')

  const [stats, recentActivities] = await Promise.all([
    getDashboardStats(),
    getRecentActivities(),
  ])

  const hasFlagged = stats.flaggedActivities > 0

  return (
    <div className="space-y-lg">
      {/* Page header */}
      <div>
        <h1 className="text-headline-md font-black italic tracking-tight text-primary-fixed">Platform Overview</h1>
        <p className="text-label-caps text-on-surface-variant mt-xs">
          Live snapshot of Garrincha Active activity and health.
        </p>
      </div>

      {/* Flagged alert */}
      {hasFlagged && (
        <div className="flex items-start gap-md rounded-xl border border-error/30 bg-error/10 px-md py-sm">
          <span
            className="material-symbols-outlined text-error mt-0.5 shrink-0"
            style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
          >
            warning
          </span>
          <div className="flex-1 text-label-caps text-error">
            <span className="font-bold">
              {stats.flaggedActivities} flagged{' '}
              {stats.flaggedActivities === 1 ? 'activity requires' : 'activities require'} review.
            </span>{' '}
            Resolve them to keep the platform clean.
          </div>
          <Link
            href="/admin/activities?status=FLAGGED"
            className="shrink-0 rounded-lg bg-error/20 px-md py-xs text-label-caps font-bold text-error hover:bg-error/30 transition-colors"
          >
            Review now
          </Link>
        </div>
      )}

      {/* KPI stat cards */}
      <div className="grid grid-cols-2 gap-sm lg:grid-cols-4">
        <StatCard title="Total Players"      value={stats.totalPlayers.toLocaleString()}      subtitle="Registered accounts"        icon={icon('group')} />
        <StatCard
          title="Active Players"
          value={stats.activePlayers.toLocaleString()}
          subtitle="Activity in last 7 days"
          icon={icon('person_check')}
          trend="up"
          trendValue={stats.totalPlayers > 0 ? `${Math.round((stats.activePlayers / stats.totalPlayers) * 100)}%` : '0%'}
        />
        <StatCard title="Total Activities"   value={stats.totalActivities.toLocaleString()}   subtitle="All time logged"            icon={icon('bolt')} />
        <StatCard title="Points Issued"      value={stats.totalPointsIssued.toLocaleString()} subtitle="Total positive ledger"      icon={icon('stars')} />
        <StatCard title="Rewards Redeemed"   value={stats.rewardsRedeemed.toLocaleString()}   subtitle="Pending + used"            icon={icon('redeem')} />
        <StatCard title="Active Challenges"  value={stats.activeChallenges.toLocaleString()}  subtitle="Ongoing, not expired"      icon={icon('emoji_events')} />
        <StatCard title="Upcoming Events"    value={stats.upcomingEvents.toLocaleString()}    subtitle="Published, future start"   icon={icon('event')} />
        <StatCard
          title="Flagged Activities"
          value={stats.flaggedActivities.toLocaleString()}
          subtitle="Awaiting moderation"
          icon={icon('flag')}
          className={hasFlagged ? 'border border-error/30' : undefined}
        />
      </div>

      {/* Recent activities + Quick links */}
      <div className="grid gap-lg lg:grid-cols-3">

        {/* Recent activities — 2/3 width on large screens */}
        <div className="glass-card rounded-xl overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-md py-sm border-b border-white/5">
            <p className="text-body-md font-bold text-on-surface">Recent Activities</p>
            <Link href="/admin/activities" className="text-label-caps text-primary-fixed hover:opacity-80">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="px-md pb-sm pt-sm text-label-caps text-on-surface-variant">Player</th>
                  <th className="px-sm pb-sm pt-sm text-label-caps text-on-surface-variant">Activity</th>
                  <th className="px-sm pb-sm pt-sm text-label-caps text-on-surface-variant">Type</th>
                  <th className="px-sm pb-sm pt-sm text-label-caps text-on-surface-variant">Status</th>
                  <th className="px-sm pb-sm pt-sm text-right text-label-caps text-on-surface-variant">Pts</th>
                  <th className="px-md pb-sm pt-sm text-right text-label-caps text-on-surface-variant">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentActivities.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-md py-10 text-center text-on-surface-variant text-label-caps">
                      No activities yet.
                    </td>
                  </tr>
                ) : (
                  recentActivities.map((activity) => (
                    <tr key={activity.id} className="transition-colors hover:bg-surface-container-high">
                      <td className="px-md py-sm">
                        <Link href={`/admin/players/${activity.user.id}`} className="flex min-w-0 items-center gap-sm">
                          {activity.user.avatarUrl ? (
                            <img src={activity.user.avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-fixed/10 text-label-caps font-bold text-primary-fixed">
                              {(activity.user.name ?? activity.user.nickname ?? '?').charAt(0).toUpperCase()}
                            </span>
                          )}
                          <span className="max-w-27.5 truncate text-body-md text-on-surface">
                            {activity.user.nickname ?? activity.user.name}
                          </span>
                        </Link>
                      </td>
                      <td className="px-sm py-sm">
                        <Link
                          href={`/admin/activities/${activity.id}`}
                          className="block max-w-37.5 truncate text-on-surface hover:text-primary-fixed"
                        >
                          {activity.title}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-sm py-sm text-label-caps text-on-surface-variant">
                        {activityTypeLabel(activity.type)}
                      </td>
                      <td className="px-sm py-sm">
                        <ActivityStatusBadge status={activity.status} />
                      </td>
                      <td className="px-sm py-sm text-right text-body-md font-bold text-on-surface">
                        {activity.pointsEarned > 0 ? `+${activity.pointsEarned}` : activity.pointsEarned}
                      </td>
                      <td className="whitespace-nowrap px-md py-sm text-right text-label-caps text-on-surface-variant">
                        {formatDateTime(activity.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick links — 1/3 width */}
        <div className="flex flex-col gap-sm">
          <h2 className="text-label-caps text-on-surface-variant">Quick Links</h2>
          <QuickLink href="/admin/players"     icon="group"               label="Players"      description="Manage accounts and points" />
          <QuickLink href="/admin/activities"  icon="bolt"                label="Activities"   description="Review and moderate logs" />
          <QuickLink href="/admin/challenges"  icon="emoji_events"        label="Challenges"   description="Create and track challenges" />
          <QuickLink href="/admin/rewards"     icon="redeem"              label="Rewards"      description="Manage reward catalogue" />
          <QuickLink href="/admin/redemptions" icon="confirmation_number" label="Redemptions"  description="Track reward usage" />
          <QuickLink href="/admin/events"      icon="event"               label="Events"       description="Publish and manage events" />
          <QuickLink href="/admin/moderation"  icon="shield"              label="Moderation"   description="Reported posts and content" />
          <QuickLink href="/admin/centers"     icon="location_city"       label="Centers"      description="Manage sports centers" />
          <QuickLink href="/admin/reports"     icon="bar_chart"           label="Reports"      description="Analytics and exports" />
          <QuickLink href="/admin/settings"    icon="settings"            label="Settings"     description="Platform configuration" />
        </div>
      </div>
    </div>
  )
}
