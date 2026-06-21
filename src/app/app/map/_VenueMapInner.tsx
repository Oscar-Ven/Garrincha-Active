'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Link from 'next/link'

// Fix default marker icons in Next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const centerIcon = new L.DivIcon({
  html: `<div style="background:#22c55e;border:2px solid white;border-radius:50%;width:16px;height:16px;box-shadow:0 2px 6px rgba(0,0,0,.5)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  className: '',
})

interface Marker { id: string; name: string; city: string; address: string; lat: number; lng: number; courts: number }

function FitBounds({ markers }: { markers: Marker[] }) {
  const map = useMap()
  useEffect(() => {
    if (markers.length === 0) return
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]))
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [map, markers])
  return null
}

export default function VenueMapInner({ markers }: { markers: Marker[] }) {
  return (
    <MapContainer
      center={[50.85045, 4.34878]}
      zoom={12}
      style={{ height: '100%', width: '100%', background: '#0f172a' }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <FitBounds markers={markers} />
      {markers.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]} icon={centerIcon}>
          <Popup>
            <div className="min-w-[160px]">
              <p className="font-bold text-slate-900">{m.name}</p>
              <p className="text-xs text-slate-500">{m.address || m.city}</p>
              {m.courts > 0 && <p className="text-xs text-green-700 mt-1">{m.courts} court{m.courts !== 1 ? 's' : ''}</p>}
              <Link
                href={`/app/courts?centerId=${m.id}`}
                className="mt-2 inline-block rounded bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-500"
              >
                Book a Court
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
