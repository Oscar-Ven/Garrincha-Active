import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import type { SessionUser } from '@/lib/auth'

export async function requireOwner(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'OWNER') redirect('/app')
  return user
}
