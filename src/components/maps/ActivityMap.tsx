'use client'

import dynamic from 'next/dynamic'

export type MapPoint = { lat: number; lng: number; alt?: number | null }

const Inner = dynamic(() => import('./_ActivityMapInner'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-slate-700" />,
})

export function ActivityMap({ points }: { points: MapPoint[] }) {
  if (!points.length) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-xl bg-slate-800/60 text-slate-500">
        <span className="mb-2 text-3xl">🗺️</span>
        <p className="text-sm">No route data recorded</p>
        <p className="mt-1 text-xs text-slate-600">Import a GPX file to see your route here</p>
      </div>
    )
  }
  return <Inner points={points} />
}
