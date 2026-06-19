'use client'

import dynamic from 'next/dynamic'

export type RouteMapPoint = { lat: number; lng: number; elevM?: number | null }

const Inner = dynamic(() => import('./_RouteMapInner'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-slate-700" />,
})

export function RouteMap({ points }: { points: RouteMapPoint[] }) {
  if (!points.length) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-xl bg-slate-800/60 text-slate-500">
        <span className="mb-2 text-3xl">🗺️</span>
        <p className="text-sm">No waypoints recorded</p>
      </div>
    )
  }
  return <Inner points={points} />
}
