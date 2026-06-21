import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { cn } from '@/lib/utils'
import { ActivityType, Level } from '@/generated/prisma'

export const metadata: Metadata = { title: 'Reports — Admin' }

// ─── Sub-components ───────────────────────────────────────────────────────────

function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
      {children}
    </th>
  )
}

function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn('px-4 py-3 text-sm text-on-surface', className)}>
      {children}
    </td>
  )
}

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center text-sm text-on-surface-variant">
        {message}
      </td>
    </tr>
  )
}

function ReportSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="glass-card overflow-hidden rounded-xl">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <span className="material-symbols-outlined text-primary-fixed" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        <h2 className="text-base font-semibold text-on-surface">{title}</h2>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

// ─── Level badge ──────────────────────────────────────────────────────────────

function LevelBadge({ level }: { level: Level }) {
  const map: Record<Level, string> = {
    BRONZE: 'text-[#CD7F32]',
    SILVER: 'text-on-surface',
    GOLD:   'text-[#FFD700]',
    ELITE:  'text-primary-fixed',
  }
  return <span className={cn('text-xs font-semibold', map[level])}>{level}</span>
}

// ─── Activity label ───────────────────────────────────────────────────────────

const ACTIVITY_LABELS: Partial<Record<ActivityType, string>> = {
  PADEL: 'Padel', TENNIS: 'Tennis', PICKLEBALL: 'Pickleball', SQUASH: 'Squash',
  RACQUETBALL: 'Racquetball', BADMINTON: 'Badminton', RUN: 'Run', WALK: 'Walk',
  CYCLING: 'Cycling', FOOTBALL_TRAINING: 'Football Training', FOOTBALL_MATCH: 'Football Match',
  FITNESS: 'Fitness', CUSTOM: 'Custom',
}

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getData() {
  const [topProfiles, activityByType, centerStats, topRewards, recentBadges] = await Promise.all([
    prisma.playerProfile.findMany({
      orderBy: { totalPoints: 'desc' },
      take: 10,
      include: {
        user: {
          select: {
            id: true, name: true, nickname: true,
            center: { select: { name: true } },
            _count: { select: { activities: true } },
          },
        },
      },
    }),
    prisma.activity.groupBy({
      by: ['type'],
      _count: { id: true },
      _sum: { distanceKm: true, durationMinutes: true, pointsEarned: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    prisma.center.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true,
        _count: { select: { players: true } },
      },
    }),
    prisma.reward.findMany({
      orderBy: { redemptions: { _count: 'desc' } },
      take: 10,
      select: {
        id: true, title: true, pointsCost: true, category: true,
        _count: { select: { redemptions: true } },
      },
    }),
    prisma.userBadge.findMany({
      orderBy: { awardedAt: 'desc' },
      take: 10,
      include: {
        badge: { select: { name: true, description: true } },
        user: { select: { name: true, nickname: true } },
      },
    }),
  ])
  return { topProfiles, activityByType, centerStats, topRewards, recentBadges }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminReportsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'PLATFORM_ADMIN') redirect('/app')

  const { topProfiles, activityByType, centerStats, topRewards, recentBadges } = await getData()

  const totalActivities   = activityByType.reduce((s, r) => s + r._count.id, 0)
  const totalDistanceKm   = activityByType.reduce((s, r) => s + (r._sum.distanceKm ?? 0), 0)
  const totalDurationHr   = activityByType.reduce((s, r) => s + (r._sum.durationMinutes ?? 0), 0) / 60
  const totalPointsEarned = activityByType.reduce((s, r) => s + (r._sum.pointsEarned ?? 0), 0)

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed/10">
          <span className="material-symbols-outlined text-primary-fixed" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>bar_chart</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Reports</h1>
          <p className="text-sm text-on-surface-variant">Platform analytics and activity insights.</p>
        </div>
      </div>

      {/* ── Summary strip ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Activities', value: totalActivities.toLocaleString() },
          { label: 'Total Distance',   value: `${totalDistanceKm.toFixed(0)} km` },
          { label: 'Hours Active',     value: `${totalDurationHr.toFixed(0)} h` },
          { label: 'Points Earned',    value: totalPointsEarned.toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} className="glass-card rounded-xl px-4 py-3">
            <p className="text-xs text-on-surface-variant">{label}</p>
            <p className="mt-1 text-xl font-bold text-primary-fixed tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Top players ── */}
      <ReportSection title="Top Players by Points" icon="military_tech">
        <table className="min-w-full divide-y divide-white/10">
          <thead>
            <tr className="bg-surface-container-lowest">
              <TableHeader>Rank</TableHeader>
              <TableHeader>Player</TableHeader>
              <TableHeader>Level</TableHeader>
              <TableHeader>Center</TableHeader>
              <TableHeader>Activities</TableHeader>
              <TableHeader>Points</TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {topProfiles.length === 0 ? (
              <EmptyRow cols={6} message="No player data yet." />
            ) : (
              topProfiles.map((profile, i) => (
                <tr key={profile.id} className="transition-colors hover:bg-surface-container-high">
                  <TableCell className="font-bold tabular-nums text-on-surface-variant">
                    {i === 0 ? <span className="text-[#FFD700]">#1</span>
                     : i === 1 ? <span className="text-on-surface">#2</span>
                     : i === 2 ? <span className="text-[#CD7F32]">#3</span>
                     : `#${i + 1}`}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-on-surface">{profile.user.name}</p>
                      <p className="text-xs text-on-surface-variant">@{profile.user.nickname}</p>
                    </div>
                  </TableCell>
                  <TableCell><LevelBadge level={profile.level} /></TableCell>
                  <TableCell className="text-on-surface-variant">{profile.user.center?.name ?? '—'}</TableCell>
                  <TableCell className="tabular-nums">{profile.user._count.activities}</TableCell>
                  <TableCell>
                    <span className="font-bold text-[#FFD700] tabular-nums">{profile.totalPoints.toLocaleString()}</span>
                  </TableCell>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ReportSection>

      {/* ── Activities by type ── */}
      <ReportSection title="Activities by Type" icon="directions_run">
        <table className="min-w-full divide-y divide-white/10">
          <thead>
            <tr className="bg-surface-container-lowest">
              <TableHeader>Type</TableHeader>
              <TableHeader>Count</TableHeader>
              <TableHeader>Total Distance</TableHeader>
              <TableHeader>Total Duration</TableHeader>
              <TableHeader>Points Awarded</TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {activityByType.length === 0 ? (
              <EmptyRow cols={5} message="No activity data yet." />
            ) : (
              activityByType.map((row) => (
                <tr key={row.type} className="transition-colors hover:bg-surface-container-high">
                  <TableCell className="font-medium">{ACTIVITY_LABELS[row.type] ?? row.type}</TableCell>
                  <TableCell className="tabular-nums">{row._count.id.toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums text-on-surface-variant">
                    {row._sum.distanceKm != null ? `${row._sum.distanceKm.toFixed(1)} km` : '—'}
                  </TableCell>
                  <TableCell className="tabular-nums text-on-surface-variant">
                    {row._sum.durationMinutes != null ? `${Math.round(row._sum.durationMinutes / 60)} h` : '—'}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-primary-fixed tabular-nums">
                      {(row._sum.pointsEarned ?? 0).toLocaleString()}
                    </span>
                  </TableCell>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ReportSection>

      {/* ── Center stats ── */}
      <ReportSection title="Center Membership" icon="location_city">
        <table className="min-w-full divide-y divide-white/10">
          <thead>
            <tr className="bg-surface-container-lowest">
              <TableHeader>Center</TableHeader>
              <TableHeader>Members</TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {centerStats.length === 0 ? (
              <EmptyRow cols={2} message="No centers yet." />
            ) : (
              centerStats.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-surface-container-high">
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="tabular-nums">{c._count.players}</TableCell>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ReportSection>

      {/* ── Top rewards ── */}
      <ReportSection title="Most Redeemed Rewards" icon="redeem">
        <table className="min-w-full divide-y divide-white/10">
          <thead>
            <tr className="bg-surface-container-lowest">
              <TableHeader>Reward</TableHeader>
              <TableHeader>Category</TableHeader>
              <TableHeader>Cost</TableHeader>
              <TableHeader>Redemptions</TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {topRewards.length === 0 ? (
              <EmptyRow cols={4} message="No redemptions yet." />
            ) : (
              topRewards.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-surface-container-high">
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell className="text-xs text-on-surface-variant">{r.category}</TableCell>
                  <TableCell>
                    <span className="font-semibold text-[#FFD700] tabular-nums">{r.pointsCost.toLocaleString()}</span>
                    <span className="ml-1 text-xs text-on-surface-variant">pts</span>
                  </TableCell>
                  <TableCell className="tabular-nums font-semibold text-primary-fixed">
                    {r._count.redemptions}
                  </TableCell>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ReportSection>

      {/* ── Recent badges ── */}
      <ReportSection title="Recently Awarded Badges" icon="workspace_premium">
        <table className="min-w-full divide-y divide-white/10">
          <thead>
            <tr className="bg-surface-container-lowest">
              <TableHeader>Player</TableHeader>
              <TableHeader>Badge</TableHeader>
              <TableHeader>Awarded</TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {recentBadges.length === 0 ? (
              <EmptyRow cols={3} message="No badges awarded yet." />
            ) : (
              recentBadges.map((ub) => (
                <tr key={ub.id} className="transition-colors hover:bg-surface-container-high">
                  <TableCell>
                    <div>
                      <p className="font-medium">{ub.user.name}</p>
                      <p className="text-xs text-on-surface-variant">@{ub.user.nickname}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-[#FFD700]">{ub.badge.name}</p>
                      {ub.badge.description && (
                        <p className="line-clamp-1 text-xs text-on-surface-variant">{ub.badge.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-on-surface-variant">
                    {new Date(ub.awardedAt).toLocaleDateString()}
                  </TableCell>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ReportSection>
    </div>
  )
}
