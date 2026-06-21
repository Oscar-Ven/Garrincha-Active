'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Brussels, Belgium — Garrincha's home
const DEFAULT_CENTER: [number, number] = [50.85045, 4.34878]

type Pt = { lat: number; lng: number }

function FollowUser({ pos }: { pos: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (pos) map.panTo(pos, { animate: true, duration: 0.4 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos?.[0], pos?.[1]])
  return null
}

export default function LiveTrackingMapInner({ path, currentPos }: { path: Pt[]; currentPos: Pt | null }) {
  const positions: [number, number][] = path.map((p) => [p.lat, p.lng])
  const curPos: [number, number] | null = currentPos ? [currentPos.lat, currentPos.lng] : null
  const center: [number, number] = curPos ?? (positions.length > 0 ? positions[0] : DEFAULT_CENTER)

  return (
    <MapContainer center={center} zoom={16} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FollowUser pos={curPos} />

      {/* Route so far */}
      {positions.length > 1 && (
        <Polyline positions={positions} pathOptions={{ color: '#16a34a', weight: 3.5, opacity: 0.9 }} />
      )}

      {/* Start marker */}
      {positions.length > 0 && (
        <CircleMarker
          center={positions[0]}
          radius={7}
          pathOptions={{ color: '#fff', weight: 2, fillColor: '#16a34a', fillOpacity: 1 }}
        />
      )}

      {/* Current position: outer pulse ring + inner dot */}
      {curPos && (
        <>
          <CircleMarker
            center={curPos}
            radius={12}
            pathOptions={{ color: '#3b82f6', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.2 }}
          />
          <CircleMarker
            center={curPos}
            radius={6}
            pathOptions={{ color: '#fff', weight: 2, fillColor: '#3b82f6', fillOpacity: 1 }}
          />
        </>
      )}
    </MapContainer>
  )
}
