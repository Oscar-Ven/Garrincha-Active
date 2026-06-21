import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const metadata = { title: 'Sponsors & Offers | Garrincha Active' }

export default async function SponsorsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const campaigns = await prisma.sponsorCampaign.findMany({
    where: { isActive: true },
    include: { sponsor: { select: { name: true, logoUrl: true, website: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white">Sponsors & Offers</h1>
        <p className="mt-1 text-sm text-slate-400">Exclusive deals and promotions from our partners</p>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-10 text-center">
          <div className="text-4xl mb-3">🤝</div>
          <p className="text-slate-400">No active campaigns right now.</p>
          <p className="mt-1 text-sm text-slate-500">Check back soon for exclusive member offers.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => (
            <div key={c.id} className="rounded-2xl border border-slate-700 bg-slate-800/60 overflow-hidden">
              <div className="px-5 py-4">
                <div className="flex items-start gap-3">
                  {c.sponsor.logoUrl && (
                    <img src={c.sponsor.logoUrl} alt={c.sponsor.name} className="h-10 w-10 rounded-lg object-contain bg-white p-1 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white">{c.title}</p>
                    <p className="text-xs text-slate-400">{c.sponsor.name}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">
                    Until {c.endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                {c.description && <p className="mt-3 text-sm text-slate-300">{c.description}</p>}
                {c.sponsor.website && (
                  <a
                    href={c.sponsor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-green-600/40 bg-green-600/10 px-3 py-1.5 text-sm font-medium text-green-400 hover:bg-green-600/20 transition-colors"
                  >
                    Visit offer
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
