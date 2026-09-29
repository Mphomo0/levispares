import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import AccountLayoutClient from './AccountLayoutClient'

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId, sessionClaims } = await auth()

  if (!userId) {
    redirect('/?sign-in=1')
  }

  if (getRole(sessionClaims) === 'admin') {
    redirect('/admin')
  }

  return <AccountLayoutClient>{children}</AccountLayoutClient>
}
