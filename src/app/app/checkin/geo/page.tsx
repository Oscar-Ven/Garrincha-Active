import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import GeoCheckin from './GeoCheckin'

export const metadata = { title: 'GPS Check-in | Garrincha Active' }

export default async function GeoCheckinPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="mx-auto max-w-sm">
      <GeoCheckin />
    </div>
  )
}
