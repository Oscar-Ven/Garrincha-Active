'use client'

import dynamic from 'next/dynamic'

type Pt = { lat: number; lng: number }

const Inner = dynamic(() => import('./_LiveTrackingMapInner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-xl bg-slate-800 text-slate-500">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
    </div>
  ),
})

export function LiveTrackingMap({ path, currentPos }: { path: Pt[]; currentPos: Pt | null }) {
  return <Inner path={path} currentPos={currentPos} />
}
