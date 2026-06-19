# Phase 2: Mobile GPS Tracking — Garrincha Active

## Overview

Phase 2 introduces a React Native companion app that records GPS routes in real-time, syncs them to the existing Garrincha Active API, and renders them as interactive maps. This document covers the full technical and product scope: app architecture, GPS implementation with `expo-location`, real-time WebSocket streaming, offline-first support, battery optimization, route visualization, and integration with the existing Next.js backend.

---

## 1. Product Goals

- Let players start a tracking session from their phone (tap Start, run, tap Stop).
- Record a precise route stored in the existing `ActivityRoutePoint` schema.
- Display live speed, distance, duration, and a map trail while running.
- Support intermittent connectivity: record locally and sync when back online.
- Show completed routes on a map in the web app (already rendering-ready via `routePoints` on `Activity`).
- Respect battery life so the app is usable across a full football training session (~90 min).

---

## 2. React Native App Structure

```
garrincha-mobile/
├── app/                          # Expo Router file-based routing
│   ├── _layout.tsx               # Root layout, auth guard
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── _layout.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Bottom tab navigator
│   │   ├── home.tsx              # Feed / dashboard
│   │   ├── track.tsx             # Active GPS tracking screen
│   │   ├── activities.tsx        # History list
│   │   └── profile.tsx
│   └── activity/[id].tsx         # Route map + detail
├── src/
│   ├── api/                      # Typed wrappers around the web API
│   │   ├── client.ts             # Axios/fetch base with auth header
│   │   ├── activities.ts
│   │   └── tracking.ts           # WebSocket session helpers
│   ├── stores/
│   │   ├── authStore.ts          # Zustand — JWT token + user
│   │   ├── trackingStore.ts      # Live session state
│   │   └── offlineQueue.ts       # Persisted queue for offline route points
│   ├── hooks/
│   │   ├── useGpsTracking.ts     # Main tracking orchestrator
│   │   ├── useWebSocket.ts       # WebSocket lifecycle
│   │   └── useOfflineSync.ts     # Background sync on reconnect
│   ├── components/
│   │   ├── TrackingMap.tsx       # react-native-maps route overlay
│   │   ├── LiveStats.tsx         # Speed / distance / duration HUD
│   │   ├── RouteReplay.tsx       # Playback on completed activity
│   │   └── StartStopButton.tsx
│   └── utils/
│       ├── geo.ts                # Haversine distance, speed calc
│       └── battery.ts            # Battery-aware interval adjustment
├── app.json
├── eas.json                      # EAS Build config
└── package.json
```

### Key dependencies

| Package | Purpose |
|---|---|
| `expo` ~52 | Managed workflow, OTA updates |
| `expo-router` ~4 | File-based navigation |
| `expo-location` | GPS, background task registration |
| `expo-task-manager` | Background location task |
| `expo-battery` | Battery level for adaptive polling |
| `react-native-maps` | Route polyline rendering |
| `zustand` + `zustand/middleware/persist` | State + offline queue |
| `@react-native-async-storage/async-storage` | Persistence layer for offline queue |
| `ws` / native WebSocket | Real-time streaming to server |
| `@tanstack/react-query` | Server state for activities feed |

---

## 3. GPS Tracking Implementation with expo-location

### 3.1 Permissions

```typescript
// src/hooks/useGpsTracking.ts
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'

export const BACKGROUND_LOCATION_TASK = 'garrincha-background-location'

export async function requestLocationPermissions(): Promise<boolean> {
  const { status: fg } = await Location.requestForegroundPermissionsAsync()
  if (fg !== 'granted') return false

  const { status: bg } = await Location.requestBackgroundPermissionsAsync()
  return bg === 'granted'
}
```

### 3.2 Foreground tracking (screen active)

```typescript
// High-accuracy, 3-second intervals while the screen is on
let foregroundSubscription: Location.LocationSubscription | null = null

export async function startForegroundTracking(
  onPoint: (point: RawGpsPoint) => void
) {
  foregroundSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 3000,          // ms
      distanceInterval: 5,         // meters — whichever fires first
    },
    (loc) => onPoint(mapLocationToPoint(loc))
  )
}

export function stopForegroundTracking() {
  foregroundSubscription?.remove()
  foregroundSubscription = null
}
```

### 3.3 Background tracking task

```typescript
// Must be defined at module level (not inside a component)
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ({ data, error }) => {
  if (error) { console.error(error); return }
  const { locations } = data as { locations: Location.LocationObject[] }
  locations.forEach((loc) => {
    const point = mapLocationToPoint(loc)
    // Enqueue to offline store — safe even if WebSocket is down
    useOfflineQueue.getState().enqueue(point)
  })
})

export async function startBackgroundTracking() {
  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,   // less battery than BestForNavigation
    timeInterval: 10000,                     // 10 s in background
    distanceInterval: 20,                    // 20 m minimum move
    showsBackgroundLocationIndicator: true,  // iOS blue bar
    foregroundService: {                     // Android foreground service
      notificationTitle: 'Garrincha Active',
      notificationBody: 'Recording your activity…',
      notificationColor: '#16a34a',
    },
    pausesUpdatesAutomatically: false,       // never auto-pause
  })
}
```

### 3.4 Point normalization

```typescript
// src/utils/geo.ts
export interface RawGpsPoint {
  latitude: number
  longitude: number
  altitude: number | null
  speed: number | null      // m/s from device
  timestamp: string         // ISO 8601
}

export function mapLocationToPoint(loc: Location.LocationObject): RawGpsPoint {
  return {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    altitude: loc.coords.altitude,
    speed: loc.coords.speed,           // convert to km/h before API call: * 3.6
    timestamp: new Date(loc.timestamp).toISOString(),
  }
}

// Haversine formula — used to compute cumulative distance client-side
export function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
```

---

## 4. Real-Time Route Recording

### 4.1 ActivityRoutePoint schema (already in place)

```prisma
model ActivityRoutePoint {
  id         String   @id @default(cuid())
  activityId String
  activity   Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  latitude   Float
  longitude  Float
  altitude   Float?
  speed      Float?   // km/h
  timestamp  DateTime
  @@map("activity_route_points")
}
```

### 4.2 Session lifecycle (REST)

**POST `/api/mobile/activities/start`**
- Authenticated via `Authorization: Bearer <jwt>` (mobile uses JWT in header, not cookie)
- Creates an `Activity` row with `status: PENDING`, returns `activityId`

**POST `/api/mobile/activities/:id/finish`**
- Body: `{ durationMinutes, distanceKm, caloriesBurned }`
- Sets `status: APPROVED`, calculates `pointsEarned` using existing `calculateActivityPoints()` from `@/lib/points-rules`
- Creates `FeedPost`, updates `PlayerProfile` aggregates

**DELETE `/api/mobile/activities/:id/discard`**
- Deletes activity if user cancels without saving

### 4.3 Batch route point ingestion

**POST `/api/mobile/activities/:id/route-points`**

```typescript
// Expected body
interface RoutePointBatch {
  points: Array<{
    latitude: number
    longitude: number
    altitude?: number
    speed?: number      // km/h
    timestamp: string   // ISO 8601
  }>
}
```

The endpoint uses `prisma.activityRoutePoint.createMany()` for efficiency. It validates that the activity belongs to the authenticated user before inserting.

```typescript
// D:\GG\src\app\api\mobile\activities\[id]\route-points\route.ts (future file)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyMobileJWT } from '@/lib/mobile-auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verifyMobileJWT(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const activity = await prisma.activity.findFirst({
    where: { id: params.id, userId: user.id },
    select: { id: true },
  })
  if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { points } = await req.json()

  await prisma.activityRoutePoint.createMany({
    data: points.map((p: RoutePointInput) => ({
      activityId: params.id,
      latitude: p.latitude,
      longitude: p.longitude,
      altitude: p.altitude ?? null,
      speed: p.speed ?? null,
      timestamp: new Date(p.timestamp),
    })),
    skipDuplicates: true,   // idempotent — safe to retry
  })

  return NextResponse.json({ inserted: points.length })
}
```

---

## 5. WebSocket for Live Tracking

### 5.1 Server-side WebSocket (Next.js custom server)

Next.js App Router does not support native WebSocket upgrades in the standard Vercel deployment. Two options:

**Option A (Recommended for Vercel/cloud):** Use a dedicated WebSocket service (e.g., Ably, Pusher, or Supabase Realtime). The mobile app publishes to a channel; the web dashboard subscribes. Zero ops overhead.

**Option B (Self-hosted / Railway / Render):** Add a custom `server.ts` using the `ws` npm package alongside Next.js.

```typescript
// server.ts (custom Node.js entrypoint — Option B)
import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { WebSocketServer, WebSocket } from 'ws'
import { verifyMobileJWTRaw } from './src/lib/mobile-auth'

const app = next({ dev: process.env.NODE_ENV !== 'production' })
const handle = app.getRequestHandler()

// activityId -> Set<WebSocket>  (web dashboard listeners)
const liveListeners = new Map<string, Set<WebSocket>>()

app.prepare().then(() => {
  const server = createServer((req, res) => handle(req, res, parse(req.url!, true)))

  const wss = new WebSocketServer({ server, path: '/ws/tracking' })

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url!, 'http://localhost')
    const token = url.searchParams.get('token')
    const activityId = url.searchParams.get('activityId')
    const role = url.searchParams.get('role') // 'tracker' | 'viewer'

    const user = token ? verifyMobileJWTRaw(token) : null
    if (!user || !activityId) { ws.close(4001, 'Unauthorized'); return }

    if (role === 'viewer') {
      // Web dashboard subscribing to a live session
      if (!liveListeners.has(activityId)) liveListeners.set(activityId, new Set())
      liveListeners.get(activityId)!.add(ws)
      ws.on('close', () => liveListeners.get(activityId)?.delete(ws))
      return
    }

    // Mobile tracker pushing points
    ws.on('message', async (raw) => {
      const point = JSON.parse(raw.toString())

      // Persist to DB asynchronously (non-blocking)
      prisma.activityRoutePoint.create({
        data: { activityId, ...point, timestamp: new Date(point.timestamp) },
      }).catch(console.error)

      // Fan out to any web dashboard viewers
      const viewers = liveListeners.get(activityId)
      if (viewers) {
        const msg = JSON.stringify({ type: 'point', data: point })
        viewers.forEach((viewer) => {
          if (viewer.readyState === WebSocket.OPEN) viewer.send(msg)
        })
      }
    })

    ws.on('close', () => liveListeners.delete(activityId))
  })

  server.listen(3000, () => console.log('> Ready on http://localhost:3000'))
})
```

### 5.2 Mobile WebSocket hook

```typescript
// src/hooks/useWebSocket.ts
import { useEffect, useRef } from 'react'
import { useTrackingStore } from '@/stores/trackingStore'
import { useOfflineQueue } from '@/stores/offlineQueue'

const WS_URL = process.env.EXPO_PUBLIC_API_WS_URL ?? 'wss://api.garrincha.app/ws/tracking'

export function useWebSocket(activityId: string | null, token: string) {
  const wsRef = useRef<WebSocket | null>(null)
  const setConnected = useTrackingStore((s) => s.setWsConnected)
  const { flush, enqueue } = useOfflineQueue.getState()

  useEffect(() => {
    if (!activityId) return

    const connect = () => {
      const ws = new WebSocket(`${WS_URL}?activityId=${activityId}&token=${token}&role=tracker`)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        flush(ws)   // drain any queued offline points
      }

      ws.onerror = () => setConnected(false)
      ws.onclose = () => {
        setConnected(false)
        // Exponential backoff reconnect
        setTimeout(connect, 3000)
      }
    }

    connect()
    return () => { wsRef.current?.close(); wsRef.current = null }
  }, [activityId])

  return wsRef
}
```

---

## 6. Offline Support

### 6.1 Strategy

The app must handle tunnels, poor stadium WiFi, and airplane mode mid-run gracefully.

- All GPS points are written to a **persistent offline queue** in AsyncStorage first.
- A background sync task attempts to flush the queue via batch REST whenever connectivity returns.
- The WebSocket is opportunistic — loss of the WebSocket does not pause recording.

### 6.2 Offline queue store

```typescript
// src/stores/offlineQueue.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { RawGpsPoint } from '@/utils/geo'
import { apiClient } from '@/api/client'

interface OfflineQueueStore {
  queue: Array<{ activityId: string; point: RawGpsPoint }>
  enqueue: (activityId: string, point: RawGpsPoint) => void
  flush: (ws?: WebSocket) => void
  syncToServer: (activityId: string) => Promise<void>
}

export const useOfflineQueue = create<OfflineQueueStore>()(
  persist(
    (set, get) => ({
      queue: [],

      enqueue: (activityId, point) =>
        set((s) => ({ queue: [...s.queue, { activityId, point }] })),

      flush: (ws) => {
        const { queue } = get()
        if (!ws || ws.readyState !== WebSocket.OPEN) return
        queue.forEach(({ point }) => ws.send(JSON.stringify(point)))
        set({ queue: [] })
      },

      syncToServer: async (activityId) => {
        const { queue } = get()
        const batch = queue
          .filter((e) => e.activityId === activityId)
          .map((e) => e.point)

        if (batch.length === 0) return

        await apiClient.post(`/api/mobile/activities/${activityId}/route-points`, {
          points: batch,
        })

        set((s) => ({
          queue: s.queue.filter((e) => e.activityId !== activityId),
        }))
      },
    }),
    {
      name: 'garrincha-offline-queue',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
```

### 6.3 Sync on reconnect

```typescript
// src/hooks/useOfflineSync.ts
import NetInfo from '@react-native-community/netinfo'
import { useOfflineQueue } from '@/stores/offlineQueue'

export function useOfflineSync(activityId: string | null) {
  useEffect(() => {
    if (!activityId) return
    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        useOfflineQueue.getState().syncToServer(activityId)
      }
    })
    return unsub
  }, [activityId])
}
```

---

## 7. Battery Optimization

### 7.1 Adaptive GPS interval

Battery drain is directly proportional to GPS accuracy and polling frequency. Garrincha Active adjusts the interval based on the activity type and current battery level.

```typescript
// src/utils/battery.ts
import * as Battery from 'expo-battery'
import type { ActivityType } from '../types'

export interface GpsConfig {
  accuracy: number          // expo-location Accuracy enum value
  timeInterval: number      // ms
  distanceInterval: number  // meters
}

export async function getAdaptiveGpsConfig(type: ActivityType): Promise<GpsConfig> {
  const level = await Battery.getBatteryLevelAsync()

  // Football training / match: session-based, coarser GPS is fine
  if (type === 'FOOTBALL_TRAINING' || type === 'FOOTBALL_MATCH') {
    return { accuracy: 3 /* Balanced */, timeInterval: 15000, distanceInterval: 30 }
  }

  // Low battery (<20%) — degrade gracefully
  if (level < 0.2) {
    return { accuracy: 3 /* Balanced */, timeInterval: 10000, distanceInterval: 20 }
  }

  // Normal — high accuracy for run/walk/cycling
  return { accuracy: 6 /* BestForNavigation */, timeInterval: 3000, distanceInterval: 5 }
}
```

### 7.2 Additional optimizations

- **Kalman filtering** — apply a lightweight Kalman filter on the device before storing points to eliminate GPS jitter without extra server load.
- **Point deduplication** — skip recording a new point if the device has not moved more than 3 m since the last point (saves storage and bandwidth for stationary periods like warm-up).
- **Screen dimming** — auto-dim to 30% brightness during active tracking using `expo-brightness`.
- **Wake lock** — use `expo-keep-awake` only while the tracking screen is visible; release immediately when the user navigates away.
- **Background interval throttle** — switch from 3 s foreground to 10 s background intervals automatically when the app is backgrounded (handled by the separate TaskManager task above).

---

## 8. Route Visualization

### 8.1 Mobile — live map during session

```typescript
// src/components/TrackingMap.tsx
import MapView, { Polyline, Marker } from 'react-native-maps'
import { useTrackingStore } from '@/stores/trackingStore'

export function TrackingMap() {
  const points = useTrackingStore((s) => s.points)

  const coords = points.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))
  const current = coords[coords.length - 1]

  return (
    <MapView
      style={{ flex: 1 }}
      showsUserLocation={false}   // we draw our own marker for color control
      followsUserLocation={false} // manual camera control
      region={current ? {
        latitude: current.latitude,
        longitude: current.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      } : undefined}
    >
      <Polyline
        coordinates={coords}
        strokeColor="#16a34a"   // brand green
        strokeWidth={4}
      />
      {current && (
        <Marker coordinate={current} pinColor="#16a34a" />
      )}
    </MapView>
  )
}
```

### 8.2 Web app — completed route overlay

The existing web app already loads `routePoints` via Prisma. A new component renders the route using a lightweight web map library.

```typescript
// D:\GG\src\components\ActivityRouteMap.tsx (future file)
// Uses Leaflet (react-leaflet) or Mapbox GL JS
import { ActivityRoutePoint } from '@/generated/prisma'

interface Props {
  routePoints: Pick<ActivityRoutePoint, 'latitude' | 'longitude' | 'altitude' | 'speed' | 'timestamp'>[]
}

export function ActivityRouteMap({ routePoints }: Props) {
  // Renders a polyline on an OpenStreetMap tile layer
  // Color-grades the line by speed (green = slow, yellow = moderate, red = fast)
  // Shows start/finish markers
  // Provides elevation chart below the map using recharts
}
```

Speed-graded coloring: split the polyline into segments, assign each segment a color from the brand palette (`green-600` → `yellow-600` → `red-600`) based on normalized speed, and render each segment as a separate polyline element.

---

## 9. Mobile Authentication

The existing web auth uses HTTP-only cookies (session tokens), which cannot be used by a native app. Phase 2 adds a parallel JWT flow:

**POST `/api/mobile/auth/login`**
- Accepts `{ email, password }`
- Verifies password with existing `verifyPassword()` from `@/lib/auth`
- Returns `{ accessToken, refreshToken, user }` — short-lived access token (15 min), long-lived refresh token (30 days) stored in `expo-secure-store`

```typescript
// D:\GG\src\lib\mobile-auth.ts (future file)
import { SignJWT, jwtVerify } from 'jose'

const ACCESS_SECRET = new TextEncoder().encode(process.env.MOBILE_JWT_SECRET!)
const REFRESH_SECRET = new TextEncoder().encode(process.env.MOBILE_REFRESH_SECRET!)

export async function signAccessToken(userId: string, role: string): Promise<string> {
  return new SignJWT({ sub: userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .sign(ACCESS_SECRET)
}

export async function verifyMobileJWT(req: Request): Promise<{ id: string; role: string } | null> {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const { payload } = await jwtVerify(auth.slice(7), ACCESS_SECRET)
    return { id: payload.sub as string, role: payload.role as string }
  } catch {
    return null
  }
}
```

---

## 10. Integration with Existing API

| Existing system | Integration point |
|---|---|
| `calculateActivityPoints()` in `@/lib/points-rules` | Called server-side on activity finish — mobile gets back `pointsEarned` in the finish response |
| `isSpeedSuspicious()` in `@/lib/points-rules` | Run on the mobile-submitted `speedKmH`; flags the activity to `FLAGGED` status the same as the web flow |
| `PlayerProfile` aggregates (`totalDistanceKm`, `totalMinutes`, `totalActivities`) | Updated in the finish endpoint using the same upsert logic as the web app |
| `FeedPost` creation | The finish endpoint creates a `FeedPost` with type `ACTIVITY`, same as web-submitted activities |
| `ChallengeParticipant` progress | The existing challenge update logic in the activity creation flow applies equally to mobile activities |
| `Level` promotion | `getLevelFromPoints()` called after finish; if the user crosses a level threshold, a notification is pushed |

---

## 11. Push Notifications (Activity-Adjacent)

Triggered by the finish endpoint and challenge engine:

- "You just ran 5.2 km — 26 points earned!"
- "You reached GOLD level!"
- "Challenge ends in 2 hours — you're 3rd place."

Use `expo-notifications` on device with FCM/APNs tokens stored in a new `UserDevice` model:

```prisma
// Add to schema.prisma
model UserDevice {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  fcmToken  String   @unique
  platform  String   // 'ios' | 'android'
  createdAt DateTime @default(now())
  @@map("user_devices")
}
```

---

## 12. Development Milestones

| Milestone | Scope | Estimated effort |
|---|---|---|
| M1 — Auth & scaffolding | Expo Router setup, login/token flow, API client | 1 week |
| M2 — Basic GPS recording | Foreground tracking, batch upload, offline queue | 2 weeks |
| M3 — WebSocket streaming | Live map, real-time viewer on web | 1 week |
| M4 — Background + battery | Background task, adaptive intervals, Kalman filter | 1 week |
| M5 — Map visualization | Route map mobile + web, speed grading, elevation chart | 1 week |
| M6 — Notifications | FCM/APNs integration, UserDevice model, trigger events | 1 week |
| M7 — QA & beta | TestFlight / internal Play Store track, Sentry, crash reporting | 1 week |

**Total estimated Phase 2 duration: ~8 weeks**

---

## 13. Environment Variables Required

Add to `.env.local` (web) and `app.config.ts` (mobile):

```env
# Web / API
MOBILE_JWT_SECRET=<strong-random-secret>
MOBILE_REFRESH_SECRET=<strong-random-secret>

# Mobile (prefixed EXPO_PUBLIC_ for client-visible, unprefixed for server-only)
EXPO_PUBLIC_API_BASE_URL=https://api.garrincha.app
EXPO_PUBLIC_API_WS_URL=wss://api.garrincha.app/ws/tracking
```

---

## 14. Open Questions / Decisions Required

1. **WebSocket hosting:** Vercel (Ably/Pusher) vs. self-hosted Railway/Render — affects cost and ops complexity.
2. **Map tiles:** OpenStreetMap (free) vs. Mapbox (paid, better UX in North Africa/Morocco) — decide before M5.
3. **iOS background location approval:** Apple review requires "always on" background location justification. Consider limiting to "while in use" + a banner reminder for Phase 2 beta.
4. **Fraud prevention for GPS routes:** Decide whether submitted routes are checked server-side for impossible segments (teleportation, impossible speed between two consecutive points) before points are credited.
5. **Route data retention:** High-frequency route points (3-second intervals, 90-minute session) can produce ~1800 rows per activity. Define a retention policy (e.g., downsample to 30-second intervals after 90 days) to manage DB size.
