import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import AdminLayoutClient from './AdminLayoutClient'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId, sessionClaims } = await auth()

  if (!userId || getRole(sessionClaims) !== 'admin') {
    redirect('/')
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
