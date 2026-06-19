'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { findNearbyCenter, geoCheckIn, type NearbyCenterResult, type GeoCheckInResult } from './actions'

type State =
  | { phase: 'idle' }
  | { phase: 'requesting' }
  | { phase: 'locating' }
  | { phase: 'no_nearby'; radius: number }
  | { phase: 'nearby'; centers: NearbyCenterResult[]; lat: number; lng: number }
  | { phase: 'checking_in'; centerId: string }
  | { phase: 'success'; result: Extract<GeoCheckInResult, { ok: true }> & { centerName: string } }
  | { phase: 'error'; message: string }
  | { phase: 'cooldown'; centerName?: string }
  | { phase: 'geo_denied' }

export default function GeoCheckin() {
  const [state, setState] = useState<State>({ phase: 'idle' })

  useEffect(() => {
    setState({ phase: 'requesting' })
    if (!navigator.geolocation) {
      setState({ phase: 'error', message: 'Your browser does not support geolocation.' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setState({ phase: 'locating' })
        try {
          const centers = await findNearbyCenter(latitude, longitude)
          if (centers.length === 0) {
            setState({ phase: 'no_nearby', radius: 150 })
          } else {
            setState({ phase: 'nearby', centers, lat: latitude, lng: longitude })
          }
        } catch {
          setState({ phase: 'error', message: 'Failed to find nearby centers. Please try again.' })
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setState({ phase: 'geo_denied' })
        } else {
          setState({ phase: 'error', message: 'Could not get your location. Please try again.' })
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  async function handleCheckIn(centerId: string, centerName: string, lat: number, lng: number) {
    setState({ phase: 'checking_in', centerId })
    try {
      const result = await geoCheckIn(centerId, lat, lng)
      if (result.ok) {
        setState({ phase: 'success', result: { ...result, centerName: result.centerName } })
      } else if (result.reason === 'COOLDOWN') {
        setState({ phase: 'cooldown', centerName })
      } else if (result.reason === 'OUT_OF_RANGE') {
        setState({ phase: 'error', message: 'You are no longer within range of this center. Please move closer and try again.' })
      } else if (result.reason === 'UNAUTHENTICATED') {
        setState({ phase: 'error', message: 'You are not logged in. Please log in and try again.' })
      } else {
        setState({ phase: 'error', message: 'Check-in failed. Please try again.' })
      }
    } catch {
      setState({ phase: 'error', message: 'Something went wrong. Please try again.' })
    }
  }

  if (state.phase === 'idle' || state.phase === 'requesting' || state.phase === 'locating') {
    return (
      <div className="mx-auto max-w-sm text-center py-20">
        <div className="text-5xl mb-4 animate-pulse">📍</div>
        <h1 className="text-xl font-bold text-white">Getting your location…</h1>
        <p className="mt-2 text-sm text-slate-400">
          {state.phase === 'locating' ? 'Looking for nearby centers…' : 'Please allow location access when prompted.'}
        </p>
      </div>
    )
  }

  if (state.phase === 'geo_denied') {
    return (
      <div className="mx-auto max-w-sm text-center py-20">
        <div className="text-5xl mb-4">🚫</div>
        <h1 className="text-xl font-bold text-white">Location Access Denied</h1>
        <p className="mt-2 text-sm text-slate-400">
          Enable location access in your browser settings to use GPS check-in.
        </p>
        <Link href="/app" className="mt-6 inline-block rounded-xl bg-slate-700 px-6 py-3 text-sm text-white hover:bg-slate-600">
          Go Home
        </Link>
      </div>
    )
  }

  if (state.phase === 'no_nearby') {
    return (
      <div className="mx-auto max-w-sm text-center py-20">
        <div className="text-5xl mb-4">📍</div>
        <h1 className="text-xl font-bold text-white">No Centers Nearby</h1>
        <p className="mt-2 text-sm text-slate-400">
          You must be within {state.radius}m of a center to check in.
        </p>
        <Link href="/app" className="mt-6 inline-block rounded-xl bg-slate-700 px-6 py-3 text-sm text-white hover:bg-slate-600">
          Go Home
        </Link>
      </div>
    )
  }

  if (state.phase === 'nearby') {
    return (
      <div className="mx-auto max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-5xl mb-4">📍</div>
          <h1 className="text-2xl font-bold text-white">Centers Nearby</h1>
          <p className="mt-1 text-sm text-slate-400">Select a center to check in</p>
        </div>
        <div className="space-y-3">
          {state.centers.map((center) => (
            <div key={center.id} className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-600/20 text-2xl">
                  🏟️
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">{center.name}</p>
                  {center.city && <p className="text-xs text-slate-400">{center.city}</p>}
                  <p className="text-xs text-green-400 mt-0.5">{center.distanceM}m away</p>
                </div>
              </div>
              <div className="mb-4 text-center">
                <p className="text-3xl font-black text-yellow-400">+50 pts</p>
              </div>
              <button
                onClick={() => handleCheckIn(center.id, center.name, state.lat, state.lng)}
                className="w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-500 transition-colors active:scale-95"
              >
                Check In
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (state.phase === 'checking_in') {
    return (
      <div className="mx-auto max-w-sm text-center py-20">
        <div className="text-5xl mb-4 animate-pulse">⏳</div>
        <h1 className="text-xl font-bold text-white">Checking in…</h1>
      </div>
    )
  }

  if (state.phase === 'success') {
    return (
      <div className="mx-auto max-w-sm text-center py-20">
        <div className="rounded-2xl border border-green-600/30 bg-green-600/10 p-8">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-green-400">Checked In!</h1>
          <p className="mt-2 text-slate-300">
            Welcome to <span className="font-semibold text-white">{state.result.centerName}</span>
          </p>
          <p className="mt-3 text-3xl font-black text-yellow-400">+{state.result.pointsAwarded} pts</p>
          <Link href="/app" className="mt-6 inline-block w-full rounded-xl bg-slate-700 py-3 text-sm font-medium text-white hover:bg-slate-600 transition-colors">
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (state.phase === 'cooldown') {
    return (
      <div className="mx-auto max-w-sm text-center py-20">
        <div className="rounded-2xl border border-green-600/30 bg-green-600/10 p-8">
          <div className="text-4xl mb-3">✅</div>
          <h2 className="text-lg font-bold text-green-400">Already Checked In</h2>
          <p className="mt-2 text-sm text-slate-300">
            You already checked in{state.centerName ? ` at ${state.centerName}` : ''} today.
          </p>
          <p className="mt-1 text-xs text-slate-500">Come back tomorrow for more points!</p>
          <Link href="/app" className="mt-5 inline-block w-full rounded-xl bg-slate-700 py-3 text-sm font-medium text-white hover:bg-slate-600 transition-colors">
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (state.phase === 'error') {
    return (
      <div className="mx-auto max-w-sm text-center py-20">
        <div className="text-5xl mb-4">❌</div>
        <h1 className="text-xl font-bold text-white">Check-in Failed</h1>
        <p className="mt-2 text-sm text-slate-400">{state.message}</p>
        <Link href="/app" className="mt-6 inline-block rounded-xl bg-slate-700 px-6 py-3 text-sm text-white hover:bg-slate-600">
          Go Home
        </Link>
      </div>
    )
  }

  return null
}
