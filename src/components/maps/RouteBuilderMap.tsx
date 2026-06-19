'use client'

import dynamic from 'next/dynamic'
import type { BuilderWaypoint } from './_RouteBuilderMapInner'

export type { BuilderWaypoint }

const Inner = dynamic(() => import('./_RouteBuilderMapInner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-xl bg-slate-800 text-slate-500">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-green-500" />
      <p className="mt-3 text-xs">Loading map…</p>
    </div>
  ),
})

type Props = {
  waypoints: BuilderWaypoint[]
  onAddPoint: (lat: number, lng: number) => void
  onRemovePoint: (index: number) => void
}

export function RouteBuilderMap({ waypoints, onAddPoint, onRemovePoint }: Props) {
  return <Inner waypoints={waypoints} onAddPoint={onAddPoint} onRemovePoint={onRemovePoint} />
}
