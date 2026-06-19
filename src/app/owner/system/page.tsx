import { requireOwner } from '@/lib/owner-auth'
import { prisma } from '@/lib/db'
import os from 'os'
import { Server, Database, Cpu, HardDrive, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'System Health | Owner Console' }

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${d}d ${h}h ${m}m`
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function HealthIndicator({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 ${ok ? 'border-green-700/30 bg-green-900/10' : 'border-red-700/30 bg-red-900/10'}`}>
      {ok
        ? <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
        : <XCircle className="h-4 w-4 text-red-400 shrink-0" />
      }
      <span className={`text-sm font-medium ${ok ? 'text-green-300' : 'text-red-300'}`}>{label}</span>
    </div>
  )
}

export default async function OwnerSystemPage() {
  await requireOwner()

  // DB ping
  const t0 = Date.now()
  let dbOk = false
  let dbPingMs = 0
  try {
    await prisma.$queryRaw`SELECT 1`
    dbPingMs = Date.now() - t0
    dbOk = true
  } catch {
    dbPingMs = -1
  }

  // Table record counts
  const [
    userCount,
    activityCount,
    feedPostCount,
    feedCommentCount,
    feedReactionCount,
    challengeCount,
    directChallengeCount,
    rewardCount,
    redemptionCount,
    auctionCount,
    auctionBidCount,
    notificationCount,
    badgeCount,
    userBadgeCount,
    centerCount,
    teamCount,
    teamMemberCount,
    squadGoalCount,
    pointsLedgerCount,
    auditLogCount,
    reportCount,
    segmentCount,
    routeCount,
    personalRecordCount,
    followCount,
    eventCount,
    eventRegistrationCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.activity.count(),
    prisma.feedPost.count(),
    prisma.feedComment.count(),
    prisma.feedReaction.count(),
    prisma.challenge.count(),
    prisma.directChallenge.count(),
    prisma.reward.count(),
    prisma.rewardRedemption.count(),
    prisma.rewardAuction.count(),
    prisma.auctionBid.count(),
    prisma.notification.count(),
    prisma.badge.count(),
    prisma.userBadge.count(),
    prisma.center.count(),
    prisma.team.count(),
    prisma.teamMember.count(),
    prisma.squadGoal.count(),
    prisma.pointsLedger.count(),
    prisma.adminAuditLog.count(),
    prisma.report.count(),
    prisma.segment.count(),
    prisma.route.count(),
    prisma.personalRecord.count(),
    prisma.follow.count(),
    prisma.event.count(),
    prisma.eventRegistration.count(),
  ])

  // Node / OS metrics
  const mem = process.memoryUsage()
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const memPct = ((usedMem / totalMem) * 100).toFixed(1)
  const heapPct = ((mem.heapUsed / mem.heapTotal) * 100).toFixed(1)
  const uptimeSec = process.uptime()
  const nodeVersion = process.version
  const platform = `${os.platform()} ${os.arch()}`
  const cpuCount = os.cpus().length
  const cpuModel = os.cpus()[0]?.model ?? 'Unknown'

  const dbHealthColor = dbPingMs < 50 ? 'text-green-400' : dbPingMs < 200 ? 'text-yellow-400' : 'text-red-400'
  const memHealthOk = parseFloat(memPct) < 85
  const heapHealthOk = parseFloat(heapPct) < 90

  const tableCounts = [
    { table: 'users', count: userCount },
    { table: 'activities', count: activityCount },
    { table: 'feed_posts', count: feedPostCount },
    { table: 'feed_comments', count: feedCommentCount },
    { table: 'feed_reactions', count: feedReactionCount },
    { table: 'challenges', count: challengeCount },
    { table: 'direct_challenges', count: directChallengeCount },
    { table: 'rewards', count: rewardCount },
    { table: 'reward_redemptions', count: redemptionCount },
    { table: 'reward_auctions', count: auctionCount },
    { table: 'auction_bids', count: auctionBidCount },
    { table: 'notifications', count: notificationCount },
    { table: 'badges', count: badgeCount },
    { table: 'user_badges', count: userBadgeCount },
    { table: 'centers', count: centerCount },
    { table: 'teams', count: teamCount },
    { table: 'team_members', count: teamMemberCount },
    { table: 'squad_goals', count: squadGoalCount },
    { table: 'points_ledger', count: pointsLedgerCount },
    { table: 'admin_audit_logs', count: auditLogCount },
    { table: 'reports', count: reportCount },
    { table: 'segments', count: segmentCount },
    { table: 'routes', count: routeCount },
    { table: 'personal_records', count: personalRecordCount },
    { table: 'follows', count: followCount },
    { table: 'events', count: eventCount },
    { table: 'event_registrations', count: eventRegistrationCount },
  ]

  const totalRecords = tableCounts.reduce((s, t) => s + t.count, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Server className="h-6 w-6 text-green-400" />
        <h1 className="text-2xl font-bold text-white">System Health</h1>
      </div>

      {/* Health checks strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HealthIndicator ok={dbOk} label={`Database ${dbOk ? `(${dbPingMs}ms)` : 'ERROR'}`} />
        <HealthIndicator ok={memHealthOk} label={`System Memory ${memPct}%`} />
        <HealthIndicator ok={heapHealthOk} label={`Heap ${heapPct}%`} />
        <HealthIndicator ok={uptimeSec > 0} label={`Process Up ${formatUptime(uptimeSec)}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Database */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-cyan-400" /> Database
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Status</span>
              <span className={dbOk ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                {dbOk ? '● Connected' : '● Disconnected'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Ping latency</span>
              <span className={`font-mono font-medium ${dbHealthColor}`}>{dbOk ? `${dbPingMs}ms` : 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Provider</span>
              <span className="text-white font-mono">SQLite (better-sqlite3)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total records</span>
              <span className="text-white font-mono">{totalRecords.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Tables</span>
              <span className="text-white font-mono">{tableCounts.length}</span>
            </div>
          </CardContent>
        </Card>

        {/* Process */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Cpu className="h-4 w-4 text-purple-400" /> Process &amp; Runtime
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Node.js</span>
              <span className="text-green-400 font-mono">{nodeVersion}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Platform</span>
              <span className="text-white font-mono">{platform}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">CPU cores</span>
              <span className="text-white font-mono">{cpuCount}× {cpuModel.split(' ').slice(0, 3).join(' ')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Process uptime</span>
              <span className="text-white font-mono">{formatUptime(uptimeSec)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">PID</span>
              <span className="text-white font-mono">{process.pid}</span>
            </div>
          </CardContent>
        </Card>

        {/* Memory */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-amber-400" /> Memory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'System — used', used: usedMem, total: totalMem, pct: parseFloat(memPct), color: memHealthOk ? 'bg-green-500' : 'bg-red-500' },
              { label: 'Heap — used', used: mem.heapUsed, total: mem.heapTotal, pct: parseFloat(heapPct), color: heapHealthOk ? 'bg-amber-500' : 'bg-red-500' },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">{m.label}</span>
                  <span className="text-white font-mono">{formatBytes(m.used)} / {formatBytes(m.total)} ({m.pct}%)</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div className={`h-full rounded-full ${m.color}`} style={{ width: `${m.pct}%` }} />
                </div>
              </div>
            ))}
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">RSS (resident set)</span>
              <span className="text-white font-mono">{formatBytes(mem.rss)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">External</span>
              <span className="text-white font-mono">{formatBytes(mem.external)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Environment */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" /> Environment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">NODE_ENV</span>
              <span className={`font-mono font-semibold ${process.env.NODE_ENV === 'production' ? 'text-green-400' : 'text-yellow-400'}`}>
                {process.env.NODE_ENV ?? 'development'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Next.js</span>
              <span className="text-white font-mono">16</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Prisma</span>
              <span className="text-white font-mono">7</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Auth</span>
              <span className="text-white font-mono">HMAC-SHA256 JWT cookie</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table record counts */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-base">
            Database Table Counts <span className="text-slate-500 font-normal text-sm ml-2">({totalRecords.toLocaleString()} total records)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {tableCounts.sort((a, b) => b.count - a.count).map((t) => (
              <div key={t.table} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2">
                <span className="text-xs text-slate-400 font-mono">{t.table}</span>
                <span className="text-xs text-white font-bold tabular-nums">{t.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
