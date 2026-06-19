import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getDashboardStats } from '@/services/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { cn, activityTypeLabel, formatDateTime } from '@/lib/utils'
import {
  Users,
  Activity,
  Zap,
  Gift,
  Trophy,
  Calendar,
  AlertTriangle,
  UserCheck,
  ArrowRight,
  Building2,
  Eye,
  FileBarChart,
  Settings,
  Ticket,
} from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Admin Dashboard — Garrincha Active' }

// ─── Recent Activities Query ──────────────────────────────────────────────────

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

// ─── Status Badge ─────────────────────────────────────────────────────────────

function ActivityStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-700' },
    PENDING:  { label: 'Pending',  className: 'bg-yellow-100 text-yellow-700' },
    FLAGGED:  { label: 'Flagged',  className: 'bg-red-100 text-red-700' },
    REJECTED: { label: 'Rejected', className: 'bg-slate-100 text-slate-500' },
  }

  const { label, className } = config[status] ?? {
    label: status,
    className: 'bg-slate-100 text-slate-500',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        className,
      )}
    >
      {label}
    </span>
  )
}

// ─── Quick Link Row ───────────────────────────────────────────────────────────

interface QuickLinkProps {
  href: string
  icon: React.ElementType
  label: string
  description: string
  accent: string
}

function QuickLink({ href, icon: Icon, label, description, accent }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:border-green-200 hover:shadow-md"
    >
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          accent,
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800 group-hover:text-green-700">
          {label}
        </p>
        <p className="truncate text-xs text-slate-400">{description}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-green-500" />
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
        <p className="mt-1 text-sm text-slate-400">
          Live snapshot of Garrincha Active activity and health.
        </p>
      </div>

      {/* Flagged activities alert */}
      {hasFlagged && (
        <div className="flex items-start gap-3 rounded-xl border border-red-700/50 bg-red-950/40 px-4 py-3.5">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-red-400"
            aria-hidden="true"
          />
          <div className="flex-1 text-sm text-red-300">
            <span className="font-semibold text-red-200">
              {stats.flaggedActivities} flagged{' '}
              {stats.flaggedActivities === 1 ? 'activity requires' : 'activities require'} review.
            </span>{' '}
            Resolve them to keep the platform clean.
          </div>
          <Link
            href="/admin/activities?status=FLAGGED"
            className="shrink-0 rounded-md bg-red-700/60 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-600"
          >
            Review now
          </Link>
        </div>
      )}

      {/* KPI cards — 8 cards in 2 rows of 4 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Total Players"
          value={stats.totalPlayers.toLocaleString()}
          subtitle="Registered accounts"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Active Players"
          value={stats.activePlayers.toLocaleString()}
          subtitle="Activity in last 7 days"
          icon={<UserCheck className="h-5 w-5" />}
          trend="up"
          trendValue={
            stats.totalPlayers > 0
              ? `${Math.round((stats.activePlayers / stats.totalPlayers) * 100)}%`
              : '0%'
          }
        />
        <StatCard
          title="Total Activities"
          value={stats.totalActivities.toLocaleString()}
          subtitle="All time logged"
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          title="Points Issued"
          value={stats.totalPointsIssued.toLocaleString()}
          subtitle="Total positive ledger"
          icon={<Zap className="h-5 w-5" />}
        />
        <StatCard
          title="Rewards Redeemed"
          value={stats.rewardsRedeemed.toLocaleString()}
          subtitle="Pending + used"
          icon={<Gift className="h-5 w-5" />}
        />
        <StatCard
          title="Active Challenges"
          value={stats.activeChallenges.toLocaleString()}
          subtitle="Ongoing, not expired"
          icon={<Trophy className="h-5 w-5" />}
        />
        <StatCard
          title="Upcoming Events"
          value={stats.upcomingEvents.toLocaleString()}
          subtitle="Published, future start"
          icon={<Calendar className="h-5 w-5" />}
        />
        <StatCard
          title="Flagged Activities"
          value={stats.flaggedActivities.toLocaleString()}
          subtitle="Awaiting moderation"
          icon={<AlertTriangle className="h-5 w-5" />}
          className={
            hasFlagged
              ? 'border-red-200 bg-red-50'
              : undefined
          }
        />
      </div>

      {/* Recent activities table + Quick links */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Recent activities — 2/3 width on large screens */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Activities</CardTitle>
            <Link
              href="/admin/activities"
              className="text-xs font-medium text-green-600 hover:text-green-500"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="px-6 pb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Player
                    </th>
                    <th className="px-3 pb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Activity
                    </th>
                    <th className="px-3 pb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Type
                    </th>
                    <th className="px-3 pb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Status
                    </th>
                    <th className="px-3 pb-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Pts
                    </th>
                    <th className="px-6 pb-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                      When
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentActivities.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-10 text-center text-slate-400"
                      >
                        No activities yet.
                      </td>
                    </tr>
                  ) : (
                    recentActivities.map((activity) => (
                      <tr
                        key={activity.id}
                        className="group transition-colors hover:bg-slate-50"
                      >
                        {/* Player */}
                        <td className="px-6 py-3">
                          <Link
                            href={`/admin/players/${activity.user.id}`}
                            className="flex min-w-0 items-center gap-2.5"
                          >
                            {activity.user.avatarUrl ? (
                              <img
                                src={activity.user.avatarUrl}
                                alt=""
                                className="h-7 w-7 shrink-0 rounded-full object-cover"
                              />
                            ) : (
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                                {(
                                  activity.user.name ??
                                  activity.user.nickname ??
                                  '?'
                                )
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            )}
                            <span className="max-w-27.5 truncate font-medium text-slate-700 group-hover:text-green-700">
                              {activity.user.nickname ?? activity.user.name}
                            </span>
                          </Link>
                        </td>

                        {/* Title */}
                        <td className="px-3 py-3">
                          <Link
                            href={`/admin/activities/${activity.id}`}
                            className="block max-w-37.5 truncate text-slate-700 hover:text-green-700"
                          >
                            {activity.title}
                          </Link>
                        </td>

                        {/* Type */}
                        <td className="whitespace-nowrap px-3 py-3 text-slate-500">
                          {activityTypeLabel(activity.type)}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3">
                          <ActivityStatusBadge status={activity.status} />
                        </td>

                        {/* Points */}
                        <td className="px-3 py-3 text-right font-medium text-slate-700">
                          {activity.pointsEarned > 0
                            ? `+${activity.pointsEarned}`
                            : activity.pointsEarned}
                        </td>

                        {/* When */}
                        <td className="whitespace-nowrap px-6 py-3 text-right text-xs text-slate-400">
                          {formatDateTime(activity.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Quick links — 1/3 width on large screens */}
        <div className="flex flex-col gap-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Quick Links
          </h2>
          <QuickLink
            href="/admin/players"
            icon={Users}
            label="Players"
            description="Manage accounts and points"
            accent="bg-blue-50 text-blue-600"
          />
          <QuickLink
            href="/admin/activities"
            icon={Activity}
            label="Activities"
            description="Review and moderate logs"
            accent="bg-green-50 text-green-600"
          />
          <QuickLink
            href="/admin/challenges"
            icon={Trophy}
            label="Challenges"
            description="Create and track challenges"
            accent="bg-yellow-50 text-yellow-600"
          />
          <QuickLink
            href="/admin/rewards"
            icon={Gift}
            label="Rewards"
            description="Manage reward catalogue"
            accent="bg-purple-50 text-purple-600"
          />
          <QuickLink
            href="/admin/redemptions"
            icon={Ticket}
            label="Redemptions"
            description="Track reward usage"
            accent="bg-pink-50 text-pink-600"
          />
          <QuickLink
            href="/admin/events"
            icon={Calendar}
            label="Events"
            description="Publish and manage events"
            accent="bg-cyan-50 text-cyan-600"
          />
          <QuickLink
            href="/admin/moderation"
            icon={Eye}
            label="Moderation"
            description="Reported posts and content"
            accent="bg-orange-50 text-orange-600"
          />
          <QuickLink
            href="/admin/centers"
            icon={Building2}
            label="Centers"
            description="Manage sports centers"
            accent="bg-teal-50 text-teal-600"
          />
          <QuickLink
            href="/admin/reports"
            icon={FileBarChart}
            label="Reports"
            description="Analytics and exports"
            accent="bg-indigo-50 text-indigo-600"
          />
          <QuickLink
            href="/admin/settings"
            icon={Settings}
            label="Settings"
            description="Platform configuration"
            accent="bg-slate-100 text-slate-600"
          />
        </div>
      </div>
    </div>
  )
}
