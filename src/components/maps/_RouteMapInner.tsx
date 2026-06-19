'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

type RoutePoint = { lat: number; lng: number; elevM?: number | null }

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length >= 2) {
      map.fitBounds(positions, { padding: [24, 24], maxZoom: 16 })
    } else if (positions.length === 1) {
      map.setView(positions[0], 14)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])
  return null
}

export default function RouteMapInner({ points }: { points: RoutePoint[] }) {
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
      {positions.map((pos, i) => {
        const isStart = i === 0
        const isEnd = i === positions.length - 1
        if (!isStart && !isEnd) return null
        return (
          <CircleMarker
            key={i}
            center={pos}
            radius={7}
            pathOptions={{
              color: '#fff',
              weight: 2,
              fillColor: isStart ? '#16a34a' : '#f59e0b',
              fillOpacity: 1,
            }}
          >
            <Popup>{isStart ? '▶ Start' : '⬛ Finish'}</Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
