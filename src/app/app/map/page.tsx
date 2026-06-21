import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { VenueMap } from './VenueMap'

export const metadata = { title: 'Find Courts | Garrincha Active' }

export default async function MapPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const centers = await prisma.center.findMany({
    where: { isActive: true, latitude: { not: null }, longitude: { not: null } },
    select: {
      id: true,
      name: true,
      city: true,
      address: true,
      latitude: true,
      longitude: true,
      _count: { select: { courts: { where: { isActive: true } } } },
    },
  })

  const markers = centers.map((c) => ({
    id: c.id,
    name: c.name,
    city: c.city ?? '',
    address: c.address ?? '',
    lat: c.latitude!,
    lng: c.longitude!,
    courts: c._count.courts,
  }))

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="px-4 py-3 border-b border-slate-700">
        <h1 className="text-lg font-bold text-white">Find Courts & Centers</h1>
        <p className="text-xs text-slate-400">{markers.length} centers near you</p>
      </div>
      <div className="flex-1">
        <VenueMap markers={markers} />
      </div>
    </div>
  )
}
