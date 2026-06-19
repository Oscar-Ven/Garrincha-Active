'use client'

import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Brussels, Belgium — Garrincha's home
const DEFAULT_CENTER: [number, number] = [50.85045, 4.34878]

export type BuilderWaypoint = { lat: number; lng: number }

type Props = {
  waypoints: BuilderWaypoint[]
  onAddPoint: (lat: number, lng: number) => void
  onRemovePoint: (index: number) => void
}

function ClickHandler({ onAddPoint }: { onAddPoint: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onAddPoint(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function RouteBuilderMapInner({ waypoints, onAddPoint, onRemovePoint }: Props) {
  const positions: [number, number][] = waypoints.map((wp) => [wp.lat, wp.lng])
  const center: [number, number] =
    positions.length > 0 ? positions[Math.floor(positions.length / 2)] : DEFAULT_CENTER

  return (
    <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onAddPoint={onAddPoint} />

      {positions.length > 1 && (
        <Polyline
          positions={positions}
          pathOptions={{ color: '#16a34a', weight: 3, opacity: 0.9 }}
        />
      )}

      {positions.map((pos, i) => {
        const isStart = i === 0
        const isEnd = i === positions.length - 1
        const color = isStart ? '#16a34a' : isEnd ? '#f59e0b' : '#94a3b8'
        return (
          <CircleMarker
            key={i}
            center={pos}
            radius={8}
            pathOptions={{ color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 }}
            eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); onRemovePoint(i) } }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{isStart ? '▶ Start' : isEnd ? '⬛ Finish' : `Waypoint ${i + 1}`}</p>
                <p className="text-xs text-gray-500">{pos[0].toFixed(5)}, {pos[1].toFixed(5)}</p>
                <button
                  className="mt-1 text-xs text-red-500 hover:text-red-700"
                  onClick={() => onRemovePoint(i)}
                >
                  Remove
                </button>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
