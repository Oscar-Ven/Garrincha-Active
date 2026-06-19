'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

type MapPoint = { lat: number; lng: number; alt?: number | null }

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length >= 2) {
      map.fitBounds(positions, { padding: [24, 24], maxZoom: 16 })
    } else if (positions.length === 1) {
      map.setView(positions[0], 15)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])
  return null
}

export default function ActivityMapInner({ points }: { points: MapPoint[] }) {
  if (!points.length) return null

  const positions: [number, number][] = points.map((p) => [p.lat, p.lng])
  const center: [number, number] = positions[Math.floor(positions.length / 2)]

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds positions={positions} />
      <Polyline
        positions={positions}
        pathOptions={{ color: '#16a34a', weight: 3.5, opacity: 0.9 }}
      />
      {/* Start marker — green */}
      <CircleMarker
        center={positions[0]}
        radius={7}
        pathOptions={{ color: '#fff', weight: 2, fillColor: '#16a34a', fillOpacity: 1 }}
      />
      {/* Finish marker — amber */}
      <CircleMarker
        center={positions[positions.length - 1]}
        radius={7}
        pathOptions={{ color: '#fff', weight: 2, fillColor: '#f59e0b', fillOpacity: 1 }}
      />
    </MapContainer>
  )
}
