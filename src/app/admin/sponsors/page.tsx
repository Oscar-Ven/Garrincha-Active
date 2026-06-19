import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { cn, formatDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Sponsors | Garrincha Admin',
  description: 'Manage sponsors, campaigns, and reward partnerships.',
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SponsorRow = {
  id: string
  name: string
  description: string | null
  logoUrl: string | null
  website: string | null
  contactEmail: string | null
  isActive: boolean
  createdAt: Date
  _count: {
    rewards: number
    challenges: number
    campaigns: number
  }
  campaigns: {
    id: string
    title: string
    startDate: Date
    endDate: Date
    impressions: number
    joins: number
    redemptions: number
    isActive: boolean
  }[]
}

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function getSponsors(): Promise<SponsorRow[]> {
  return prisma.sponsor.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          rewards: true,
          challenges: true,
          campaigns: true,
        },
      },
      campaigns: {
        orderBy: { startDate: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
          impressions: true,
          joins: true,
          redemptions: true,
          isActive: true,
        },
      },
    },
  })
}

// ─── Server Actions ───────────────────────────────────────────────────────────

async function createSponsor(formData: FormData) {
  'use server'
  const user = await getCurrentUser()
  if (!user || user.role !== 'PLATFORM_ADMIN') redirect('/unauthorized')

  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const description = (formData.get('description') as string | null)?.trim() || null
  const logoUrl = (formData.get('logoUrl') as string | null)?.trim() || null
  const website = (formData.get('website') as string | null)?.trim() || null
  const contactEmail = (formData.get('contactEmail') as string | null)?.trim() || null

  if (!name) return

  await prisma.sponsor.create({
    data: {
      name,
      description,
      logoUrl,
      website,
      contactEmail,
      isActive: true,
    },
  })

  revalidatePath('/admin/sponsors')
}

async function toggleSponsorActive(formData: FormData) {
  'use server'
  const user = await getCurrentUser()
  if (!user || user.role !== 'PLATFORM_ADMIN') redirect('/unauthorized')

  const id = formData.get('id') as string
  const currentActive = formData.get('isActive') === 'true'

  if (!id) return

  await prisma.sponsor.update({
    where: { id },
    data: { isActive: !currentActive },
  })

  revalidatePath('/admin/sponsors')
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryStats({
  total,
  active,
  totalRewards,
  totalCampaigns,
}: {
  total: number
  active: number
  totalRewards: number
  totalCampaigns: number
}) {
  const stats = [
    {
      label: 'Total Sponsors',
      value: total,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      ),
      color: 'text-yellow-400',
      bg: 'bg-yellow-600/10',
      ring: 'ring-yellow-600/20',
    },
    {
      label: 'Active Sponsors',
      value: active,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-green-400',
      bg: 'bg-green-600/10',
      ring: 'ring-green-600/20',
    },
    {
      label: 'Sponsored Rewards',
      value: totalRewards,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      ),
      color: 'text-blue-400',
      bg: 'bg-blue-600/10',
      ring: 'ring-blue-600/20',
    },
    {
      label: 'Total Campaigns',
      value: totalCampaigns,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.995.806 1.5 1.184" />
        </svg>
      ),
      color: 'text-purple-400',
      bg: 'bg-purple-600/10',
      ring: 'ring-purple-600/20',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className={cn(
            'flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 ring-1',
            s.ring,
          )}
        >
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', s.bg, s.color)}>
            {s.icon}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs text-slate-400">{s.label}</p>
            <p className={cn('text-xl font-bold tabular-nums', s.color)}>
              {s.value.toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Create Sponsor Form ──────────────────────────────────────────────────────

function CreateSponsorForm() {
  return (
    <details className="group rounded-2xl border border-slate-700 bg-slate-800/60">
      <summary className="flex cursor-pointer select-none items-center justify-between gap-3 rounded-2xl px-5 py-4 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 list-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-600/15 text-green-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </span>
          Create New Sponsor
        </span>
        <svg
          className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>

      <form
        action={createSponsor}
        className="border-t border-slate-700 px-5 pb-5 pt-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Name */}
          <div className="sm:col-span-2">
            <label htmlFor="cs-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Sponsor Name <span className="text-red-400">*</span>
            </label>
            <input
              id="cs-name"
              name="name"
              type="text"
              required
              maxLength={120}
              placeholder="e.g. Nike, Adidas, Red Bull"
              className="w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-green-600 focus:ring-1 focus:ring-green-600"
            />
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label htmlFor="cs-desc" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Description
            </label>
            <textarea
              id="cs-desc"
              name="description"
              rows={3}
              maxLength={500}
              placeholder="Brief description of the sponsor and their partnership goals..."
              className="w-full resize-none rounded-xl border border-slate-600 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-green-600 focus:ring-1 focus:ring-green-600"
            />
          </div>

          {/* Logo URL */}
          <div>
            <label htmlFor="cs-logo" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Logo URL
            </label>
            <input
              id="cs-logo"
              name="logoUrl"
              type="url"
              placeholder="https://example.com/logo.png"
              className="w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-green-600 focus:ring-1 focus:ring-green-600"
            />
          </div>

          {/* Website */}
          <div>
            <label htmlFor="cs-website" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Website
            </label>
            <input
              id="cs-website"
              name="website"
              type="url"
              placeholder="https://sponsor.com"
              className="w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-green-600 focus:ring-1 focus:ring-green-600"
            />
          </div>

          {/* Contact Email */}
          <div className="sm:col-span-2">
            <label htmlFor="cs-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Contact Email
            </label>
            <input
              id="cs-email"
              name="contactEmail"
              type="email"
              placeholder="partner@sponsor.com"
              className="w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-green-600 focus:ring-1 focus:ring-green-600"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="reset"
            className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
          >
            Reset
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-green-900/30 transition hover:bg-green-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create Sponsor
          </button>
        </div>
      </form>
    </details>
  )
}

// ─── Campaign Analytics Panel ─────────────────────────────────────────────────

function CampaignAnalyticsPanel({ sponsor }: { sponsor: SponsorRow }) {
  const totalImpressions = sponsor.campaigns.reduce((s, c) => s + c.impressions, 0)
  const totalJoins = sponsor.campaigns.reduce((s, c) => s + c.joins, 0)
  const totalRedemptions = sponsor.campaigns.reduce((s, c) => s + c.redemptions, 0)
  const conversionRate =
    totalImpressions > 0 ? ((totalJoins / totalImpressions) * 100).toFixed(1) : '0.0'
  const hasCampaigns = sponsor.campaigns.length > 0

  return (
    <div className="mt-3 rounded-xl border border-slate-700/60 bg-slate-900/50 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Campaign Analytics
      </p>

      {!hasCampaigns ? (
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-700 px-4 py-3 text-sm text-slate-500">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.995.806 1.5 1.184" />
          </svg>
          No campaigns yet
        </div>
      ) : (
        <>
          {/* Aggregate metrics */}
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: 'Impressions', value: totalImpressions.toLocaleString(), color: 'text-blue-400' },
              { label: 'Joins', value: totalJoins.toLocaleString(), color: 'text-green-400' },
              { label: 'Redemptions', value: totalRedemptions.toLocaleString(), color: 'text-yellow-400' },
              { label: 'Conv. Rate', value: `${conversionRate}%`, color: 'text-purple-400' },
            ].map((m) => (
              <div key={m.label} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2">
                <p className="text-xs text-slate-500">{m.label}</p>
                <p className={cn('text-base font-bold tabular-nums', m.color)}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Campaign list */}
          <div className="space-y-2">
            {sponsor.campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex flex-col gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex h-1.5 w-1.5 rounded-full shrink-0',
                        campaign.isActive ? 'bg-green-400' : 'bg-slate-600',
                      )}
                      aria-hidden="true"
                    />
                    <p className="truncate text-sm font-medium text-slate-200">{campaign.title}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatDate(campaign.startDate)} – {formatDate(campaign.endDate)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-xs text-slate-400">
                  <span>
                    <span className="font-semibold text-blue-400">{campaign.impressions.toLocaleString()}</span>{' '}
                    impr.
                  </span>
                  <span>
                    <span className="font-semibold text-green-400">{campaign.joins.toLocaleString()}</span>{' '}
                    joins
                  </span>
                  <span>
                    <span className="font-semibold text-yellow-400">{campaign.redemptions.toLocaleString()}</span>{' '}
                    redeem
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Sponsor Table Row ────────────────────────────────────────────────────────

function SponsorTableRow({ sponsor }: { sponsor: SponsorRow }) {
  const activeRewards = sponsor._count.rewards
  const campaigns = sponsor._count.campaigns
  const challenges = sponsor._count.challenges

  return (
    <details className="group/row border-b border-slate-700/50 last:border-b-0">
      <summary className="flex cursor-pointer select-none items-center gap-4 px-4 py-3.5 transition-colors hover:bg-slate-800/50 list-none [&::-webkit-details-marker]:hidden sm:px-5">
        {/* Logo / Avatar */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
          {sponsor.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sponsor.logoUrl}
              alt={`${sponsor.name} logo`}
              className="h-full w-full object-contain p-1"
            />
          ) : (
            <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          )}
        </div>

        {/* Name + email */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-100">{sponsor.name}</p>
          <p className="truncate text-xs text-slate-500">
            {sponsor.contactEmail ?? (sponsor.website ?? 'No contact info')}
          </p>
        </div>

        {/* Counts — hidden on mobile, shown on sm+ */}
        <div className="hidden items-center gap-5 text-xs text-slate-400 sm:flex">
          <span className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <span className="font-semibold text-slate-200">{activeRewards}</span> rewards
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.995.806 1.5 1.184" />
            </svg>
            <span className="font-semibold text-slate-200">{campaigns}</span> campaigns
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
            </svg>
            <span className="font-semibold text-slate-200">{challenges}</span> challenges
          </span>
        </div>

        {/* Status badge + toggle */}
        <div className="flex shrink-0 items-center gap-3">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
              sponsor.isActive
                ? 'bg-green-600/15 text-green-400'
                : 'bg-slate-700 text-slate-400',
            )}
          >
            {sponsor.isActive ? 'Active' : 'Inactive'}
          </span>
          <form action={toggleSponsorActive}>
            <input type="hidden" name="id" value={sponsor.id} />
            <input type="hidden" name="isActive" value={String(sponsor.isActive)} />
            <button
              type="submit"
              title={sponsor.isActive ? 'Deactivate sponsor' : 'Activate sponsor'}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg border text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600',
                sponsor.isActive
                  ? 'border-red-800/50 bg-red-900/20 text-red-400 hover:bg-red-900/40'
                  : 'border-green-800/50 bg-green-900/20 text-green-400 hover:bg-green-900/40',
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {sponsor.isActive ? (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </button>
          </form>
          <svg
            className="h-4 w-4 shrink-0 text-slate-600 transition-transform group-open/row:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </summary>

      {/* Expanded detail row */}
      <div className="border-t border-slate-700/50 px-4 py-4 sm:px-5">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Sponsor detail card */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sponsor Details
            </p>
            <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 space-y-2">
              {sponsor.description && (
                <p className="text-sm text-slate-300 leading-relaxed">{sponsor.description}</p>
              )}
              <dl className="space-y-1.5 text-xs">
                {sponsor.website && (
                  <div className="flex items-center gap-2">
                    <dt className="w-20 shrink-0 font-semibold text-slate-500">Website</dt>
                    <dd>
                      <a
                        href={sponsor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-blue-400 hover:text-blue-300 hover:underline"
                      >
                        {sponsor.website.replace(/^https?:\/\//, '')}
                      </a>
                    </dd>
                  </div>
                )}
                {sponsor.contactEmail && (
                  <div className="flex items-center gap-2">
                    <dt className="w-20 shrink-0 font-semibold text-slate-500">Email</dt>
                    <dd>
                      <a
                        href={`mailto:${sponsor.contactEmail}`}
                        className="text-blue-400 hover:text-blue-300 hover:underline"
                      >
                        {sponsor.contactEmail}
                      </a>
                    </dd>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <dt className="w-20 shrink-0 font-semibold text-slate-500">Joined</dt>
                  <dd className="text-slate-400">{formatDate(sponsor.createdAt)}</dd>
                </div>
              </dl>

              {/* Mobile counts */}
              <div className="flex flex-wrap gap-3 pt-1 text-xs text-slate-400 sm:hidden">
                <span>
                  <span className="font-semibold text-slate-200">{sponsor._count.rewards}</span> rewards
                </span>
                <span>
                  <span className="font-semibold text-slate-200">{sponsor._count.campaigns}</span> campaigns
                </span>
                <span>
                  <span className="font-semibold text-slate-200">{sponsor._count.challenges}</span> challenges
                </span>
              </div>
            </div>
          </div>

          {/* Campaign analytics */}
          <div>
            <CampaignAnalyticsPanel sponsor={sponsor} />
          </div>
        </div>
      </div>
    </details>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-700 bg-slate-800/30 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-600/10 text-yellow-400">
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      </div>
      <div>
        <p className="text-base font-semibold text-slate-200">No sponsors yet</p>
        <p className="mt-1 text-sm text-slate-400">
          Use the form above to add your first sponsor and begin building partnerships.
        </p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SponsorsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'PLATFORM_ADMIN') redirect('/admin')

  const sponsors = await getSponsors()

  const totalActive = sponsors.filter((s) => s.isActive).length
  const totalRewards = sponsors.reduce((sum, s) => sum + s._count.rewards, 0)
  const totalCampaigns = sponsors.reduce((sum, s) => sum + s._count.campaigns, 0)

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Sponsors
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage sponsor partnerships, campaigns, and reward associations.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm">
          <span className="text-slate-400">Total:</span>
          <span className="font-bold text-white">{sponsors.length}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Active:</span>
          <span className="font-bold text-green-400">{totalActive}</span>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <SummaryStats
        total={sponsors.length}
        active={totalActive}
        totalRewards={totalRewards}
        totalCampaigns={totalCampaigns}
      />

      {/* ── Create Sponsor Form ── */}
      <CreateSponsorForm />

      {/* ── Sponsors Table ── */}
      <section aria-label="Sponsors list">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            All Sponsors
          </p>
          <p className="text-xs text-slate-500">
            {sponsors.length} {sponsors.length === 1 ? 'sponsor' : 'sponsors'}
          </p>
        </div>

        {sponsors.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/40">
            {/* Table header */}
            <div className="hidden border-b border-slate-700 bg-slate-800/80 px-5 py-3 sm:grid sm:grid-cols-[auto_1fr_auto_auto] sm:items-center sm:gap-4">
              <div className="w-10" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Sponsor
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Associations
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Status
              </p>
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-700/50">
              {sponsors.map((sponsor) => (
                <SponsorTableRow key={sponsor.id} sponsor={sponsor} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
