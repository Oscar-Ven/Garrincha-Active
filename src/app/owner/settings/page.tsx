import { requireOwner } from '@/lib/owner-auth'
import { Settings, Crown, Shield, Database, Globe } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export const metadata = { title: 'Settings | Owner Console' }

export default async function OwnerSettingsPage() {
  const owner = await requireOwner()

  const sections = [
    {
      title: 'Platform Identity',
      icon: Globe,
      color: 'text-blue-400',
      items: [
        { label: 'Platform Name', value: 'Garrincha Active', status: 'configured' },
        { label: 'Domain', value: 'localhost:3000 (dev)', status: 'dev' },
        { label: 'Environment', value: process.env.NODE_ENV ?? 'development', status: process.env.NODE_ENV === 'production' ? 'production' : 'dev' },
        { label: 'Timezone', value: 'UTC', status: 'configured' },
      ],
    },
    {
      title: 'Authentication',
      icon: Shield,
      color: 'text-green-400',
      items: [
        { label: 'Auth Method', value: 'HMAC-SHA256 JWT cookie', status: 'configured' },
        { label: 'Session Cookie', value: 'ga_session (HttpOnly, SameSite=Lax)', status: 'configured' },
        { label: 'Session Duration', value: '7 days', status: 'configured' },
        { label: 'SESSION_SECRET', value: process.env.SESSION_SECRET ? '●●●●●●●●●●●● (set)' : 'NOT SET — using default!', status: process.env.SESSION_SECRET ? 'configured' : 'warning' },
      ],
    },
    {
      title: 'Database',
      icon: Database,
      color: 'text-purple-400',
      items: [
        { label: 'Provider', value: 'SQLite (better-sqlite3)', status: 'configured' },
        { label: 'ORM', value: 'Prisma 7', status: 'configured' },
        { label: 'Generated client', value: 'src/generated/prisma', status: 'configured' },
        { label: 'File', value: 'prisma/dev.db', status: 'dev' },
      ],
    },
    {
      title: 'Access Control',
      icon: Crown,
      color: 'text-amber-400',
      items: [
        { label: 'Owner email', value: owner.email, status: 'configured' },
        { label: 'Owner name', value: owner.name, status: 'configured' },
        { label: 'Roles available', value: 'OWNER · PLATFORM_ADMIN · CENTER_ADMIN · SPONSOR_ADMIN · PLAYER', status: 'configured' },
        { label: 'Owner console path', value: '/owner', status: 'configured' },
        { label: 'Admin console path', value: '/admin', status: 'configured' },
      ],
    },
  ]

  const statusColors: Record<string, string> = {
    configured: 'text-green-400',
    dev: 'text-yellow-400',
    warning: 'text-red-400',
    production: 'text-blue-400',
  }
  const statusLabels: Record<string, string> = {
    configured: '✓',
    dev: 'DEV',
    warning: '⚠',
    production: 'PROD',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-slate-400" />
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      <div className="rounded-xl border border-amber-700/30 bg-amber-900/10 px-5 py-3 text-sm text-amber-300">
        Platform configuration is currently managed via environment variables and CLAUDE.md. Live-edit settings will be added in a future release.
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.title} className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <section.icon className={`h-4 w-4 ${section.color}`} />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {section.items.map((item) => (
                <div key={item.label} className="flex items-start justify-between gap-4">
                  <span className="text-xs text-slate-400 shrink-0">{item.label}</span>
                  <div className="flex items-center gap-2 text-right min-w-0">
                    <span className="text-xs text-white font-mono truncate max-w-56">{item.value}</span>
                    <span className={`text-xs font-bold shrink-0 ${statusColors[item.status] ?? 'text-slate-500'}`}>
                      {statusLabels[item.status] ?? item.status}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick deployment checklist */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-base">Pre-Deployment Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { item: 'Set SESSION_SECRET to a strong random value in .env', done: !!process.env.SESSION_SECRET && !process.env.SESSION_SECRET.includes('change-in-production') },
              { item: 'Switch database to PostgreSQL (update prisma.config.ts)', done: false },
              { item: 'Set NODE_ENV=production', done: process.env.NODE_ENV === 'production' },
              { item: 'Configure a real domain (update CORS, cookie settings)', done: false },
              { item: 'Set up real reward prizes for auctions', done: false },
              { item: 'Onboard first real center/sports club', done: false },
              { item: 'Add PWA manifest for mobile installation', done: false },
            ].map((c) => (
              <div key={c.item} className="flex items-center gap-3 rounded-lg px-3 py-2 bg-slate-800/40">
                <span className={`text-lg ${c.done ? 'text-green-400' : 'text-slate-600'}`}>
                  {c.done ? '✓' : '○'}
                </span>
                <p className={`text-sm ${c.done ? 'text-green-300' : 'text-slate-400'}`}>{c.item}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Links */}
      <div className="flex flex-wrap gap-3">
        <Link href="/admin" className="rounded-lg bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 text-sm font-medium transition-colors border border-slate-700">
          Admin Console →
        </Link>
        <Link href="/owner/system" className="rounded-lg bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 text-sm font-medium transition-colors border border-slate-700">
          System Health →
        </Link>
      </div>
    </div>
  )
}
