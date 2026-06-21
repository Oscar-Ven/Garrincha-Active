'use client'

import dynamic from 'next/dynamic'

const VenueMapInner = dynamic(() => import('./_VenueMapInner'), { ssr: false, loading: () => (
  <div className="h-full w-full bg-slate-900 flex items-center justify-center">
    <div className="text-slate-500 text-sm">Loading map…</div>
  </div>
)})

export function VenueMap(props: React.ComponentProps<typeof VenueMapInner>) {
  return <VenueMapInner {...props} />
}
