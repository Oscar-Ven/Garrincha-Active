import { prisma } from '@/lib/db'
import RegisterForm from './register-form'

export const metadata = {
  title: 'Register',
  description: 'Create your Garrincha Active account.',
}

type Props = {
  searchParams: Promise<{ ref?: string }>
}

export default async function RegisterPage({ searchParams }: Props) {
  const { ref } = await searchParams

  const centers = await prisma.center.findMany({
    where: { isActive: true },
    select: { id: true, name: true, city: true },
    orderBy: { name: 'asc' },
  })

  return <RegisterForm centers={centers} initialReferralCode={ref ?? ''} />
}
