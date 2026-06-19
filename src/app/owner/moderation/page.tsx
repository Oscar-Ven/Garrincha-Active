import { requireOwner } from '@/lib/owner-auth'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { approveActivity as approveActivityService, rejectActivity as rejectActivityService } from '@/services/activities'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Eye, Flag, AlertTriangle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Moderation | Owner Console' }

async function approveActivity(activityId: string) {
  'use server'
  const caller = await getCurrentUser()
  if (!caller || caller.role !== 'OWNER') return
  await approveActivityService(activityId, caller.id)
  redirect('/owner/moderation')
}

async function rejectActivity(activityId: string) {
  'use server'
  const caller = await getCurrentUser()
  if (!caller || caller.role !== 'OWNER') return
  await rejectActivityService(activityId, caller.id, 'Rejected by owner via moderation panel')
  redirect('/owner/moderation')
}

async function dismissReport(reportId: string) {
  'use server'
  const caller = await getCurrentUser()
  if (!caller || caller.role !== 'OWNER') return
  await prisma.report.update({ where: { id: reportId }, data: { resolved: true, resolvedAt: new Date() } })
  redirect('/owner/moderation')
}

export default async function OwnerModerationPage() {
  await requireOwner()

  const [
    flaggedActivities,
    pendingActivities,
    pendingReports,
    hiddenPosts,
    recentHiddenComments,
  ] = await Promise.all([
    prisma.activity.findMany({
      where: { status: 'FLAGGED' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { name: true, email: true, nickname: true } } },
    }),
    prisma.activity.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { name: true } } },
    }),
    prisma.report.findMany({
      where: { resolved: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        reporter: { select: { name: true, email: true } },
      },
    }),
    prisma.feedPost.count({ where: { moderationStatus: 'HIDDEN' } }),
    prisma.feedComment.count({ where: { moderationStatus: 'HIDDEN' } }),
  ])

  const TYPE_EMOJI: Record<string, string> = {
    RUN: '🏃', WALK: '🚶', CYCLING: '🚴', FOOTBALL_TRAINING: '⚽',
    FOOTBALL_MATCH: '🏟️', FITNESS: '💪', CUSTOM: '🎯',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Eye className="h-6 w-6 text-red-400" />
        <h1 className="text-2xl font-bold text-white">Moderation</h1>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Flagged Activities', value: flaggedActivities.length, color: flaggedActivities.length > 0 ? 'text-red-400' : 'text-green-400', border: flaggedActivities.length > 0 ? 'border-red-700/30' : 'border-slate-800' },
          { label: 'Unresolved Reports', value: pendingReports.length, color: pendingReports.length > 0 ? 'text-yellow-400' : 'text-green-400', border: pendingReports.length > 0 ? 'border-yellow-700/30' : 'border-slate-800' },
          { label: 'Hidden Posts', value: hiddenPosts, color: 'text-slate-400', border: 'border-slate-800' },
          { label: 'Hidden Comments', value: recentHiddenComments, color: 'text-slate-400', border: 'border-slate-800' },
        ].map((s) => (
          <Card key={s.label} className={`bg-slate-900 border ${s.border}`}>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {flaggedActivities.length === 0 && pendingReports.length === 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-green-700/30 bg-green-900/10 px-6 py-4">
          <CheckCircle className="h-5 w-5 text-green-400" />
          <p className="text-green-300 font-medium">All clear — no flagged content or unresolved reports.</p>
        </div>
      )}

      {/* Flagged activities */}
      {flaggedActivities.length > 0 && (
        <Card className="bg-slate-900 border-red-800/30">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Flag className="h-4 w-4 text-red-400" /> Flagged Activities ({flaggedActivities.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-800/60">
              {flaggedActivities.map((a) => (
                <div key={a.id} className="px-4 py-3 flex items-start gap-4">
                  <span className="text-xl">{TYPE_EMOJI[a.type] ?? '🎯'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{a.title}</p>
                    <p className="text-xs text-slate-400">{a.user.name} · @{a.user.nickname}</p>
                    {a.flagReason && (
                      <p className="text-xs text-red-300 mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> {a.flagReason}
                      </p>
                    )}
                    <p className="text-xs text-slate-600 mt-1">
                      {a.distanceKm ? `${a.distanceKm.toFixed(1)} km · ` : ''}{a.durationMinutes} min ·{' '}
                      {new Date(a.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <form action={approveActivity.bind(null, a.id)}>
                      <button type="submit" className="text-xs rounded px-2 py-1 bg-green-900/30 text-green-300 border border-green-700/30 hover:bg-green-900/60 transition-colors">
                        Approve
                      </button>
                    </form>
                    <form action={rejectActivity.bind(null, a.id)}>
                      <button type="submit" className="text-xs rounded px-2 py-1 bg-red-900/30 text-red-300 border border-red-700/30 hover:bg-red-900/60 transition-colors">
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending activities */}
      {pendingActivities.length > 0 && (
        <Card className="bg-slate-900 border-yellow-800/30">
          <CardHeader>
            <CardTitle className="text-white text-base">Pending Activities ({pendingActivities.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingActivities.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg bg-slate-800/40 px-3 py-2">
                <span>{TYPE_EMOJI[a.type] ?? '🎯'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{a.title}</p>
                  <p className="text-xs text-slate-500">{a.user.name}</p>
                </div>
                <div className="flex gap-2">
                  <form action={approveActivity.bind(null, a.id)}>
                    <button type="submit" className="text-xs rounded px-2 py-1 bg-green-900/30 text-green-300 border border-green-700/30 hover:bg-green-900/60 transition-colors">
                      Approve
                    </button>
                  </form>
                  <form action={rejectActivity.bind(null, a.id)}>
                    <button type="submit" className="text-xs rounded px-2 py-1 bg-red-900/30 text-red-300 border border-red-700/30 hover:bg-red-900/60 transition-colors">
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Unresolved reports */}
      {pendingReports.length > 0 && (
        <Card className="bg-slate-900 border-yellow-800/30">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400" /> Unresolved Reports ({pendingReports.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-800/60">
              {pendingReports.map((r) => (
                <div key={r.id} className="px-4 py-3 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{r.reason}</p>
                    {r.details && <p className="text-xs text-slate-400 mt-0.5">{r.details}</p>}
                    <p className="text-xs text-slate-500 mt-1">
                      Reported by {r.reporter.name} ({r.reporter.email})
                    </p>
                    {r.postId && <p className="text-xs text-slate-600 font-mono">Post: {r.postId.slice(0, 16)}…</p>}
                    {r.reportedId && <p className="text-xs text-slate-600 font-mono">User: {r.reportedId.slice(0, 16)}…</p>}
                    <p className="text-xs text-slate-600">
                      {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <form action={dismissReport.bind(null, r.id)}>
                    <button type="submit" className="text-xs rounded px-2 py-1 bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 transition-colors">
                      Dismiss
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Link to admin moderation */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-white font-medium text-sm">Full moderation controls</p>
          <p className="text-slate-400 text-xs mt-0.5">Hide feed posts, manage comments, view all reports</p>
        </div>
        <Link href="/admin/moderation" className="rounded-lg bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 text-sm font-medium transition-colors">
          Open Admin Panel →
        </Link>
      </div>
    </div>
  )
}
