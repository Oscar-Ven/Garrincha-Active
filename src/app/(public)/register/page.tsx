import { prisma } from '@/lib/db'
import RegisterForm from './register-form'

export const metadata = {
  title: 'Register',
  description: 'Create your Garrincha Active account.',
}

export default async function RegisterPage() {
  const centers = await prisma.center.findMany({
    where: { isActive: true },
    select: { id: true, name: true, city: true },
    orderBy: { name: 'asc' },
  })

  return <RegisterForm centers={centers} />
}
