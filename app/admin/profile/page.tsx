'use client'

import { useUser, useClerk } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function AdminProfilePage() {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()

  const convexUser = useQuery(
    api.users.getByClerkId,
    user?.id ? { clerkId: user.id } : 'skip'
  )
  const userOrders = useQuery(api.orders.listByUser)
  const userAddresses = useQuery(api.addresses.listByUser)

  if (!isLoaded || convexUser === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading profile...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <Card className="max-w-md mx-auto mt-10">
        <CardHeader>
          <CardTitle>Not Authenticated</CardTitle>
          <CardDescription>Please sign in to view your profile.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const totalSpent = userOrders?.reduce((sum, o) => {
    if (o.status !== 'cancelled') return sum + o.total
    return sum
  }, 0) ?? 0

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Profile</h2>
        <p className="text-muted-foreground">Your admin account details.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-col items-center text-center">
            {user.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt={user.fullName || 'Profile'}
                width={96}
                height={96}
                className="rounded-full mb-4"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-brand dark:bg-orange-900/30 flex items-center justify-center mb-4">
                <span className="text-3xl font-bold text-brand dark:text-brand">
                  {(user.fullName || user.primaryEmailAddress?.emailAddress || 'A').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <CardTitle>{user.fullName || 'Admin User'}</CardTitle>
            <CardDescription>{user.primaryEmailAddress?.emailAddress}</CardDescription>
            <div className="flex gap-2 mt-4">
              <Badge variant="default" className="uppercase">
                {convexUser?.role || 'admin'}
              </Badge>
              <Badge
                variant={convexUser?.isActive !== false ? 'outline' : 'destructive'}
                className="uppercase"
              >
                {convexUser?.isActive !== false ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 border-t">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Username</span>
                <span className="font-medium">{user.username || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{user.primaryPhoneNumber?.phoneNumber || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Joined</span>
                <span className="font-medium">
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('en-ZA')
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Sign In</span>
                <span className="font-medium">
                  {user.lastSignInAt
                    ? new Date(user.lastSignInAt).toLocaleDateString('en-ZA')
                    : '—'}
                </span>
              </div>
            </div>

            <div className="pt-4">
              <Button
                variant="outline"
                className="w-full text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/50"
                onClick={handleSignOut}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats & Details */}
        <div className="md:col-span-2 space-y-4 sm:space-y-6">
          {/* Stats */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-3 sm:p-6">
                <div className="text-xl sm:text-2xl font-bold">{userOrders?.length ?? '...'}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Total Orders</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-6">
                <div className="text-xl sm:text-2xl font-bold">R{totalSpent.toFixed(2)}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Total Spent</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-6">
                <div className="text-xl sm:text-2xl font-bold">{userAddresses?.length ?? '...'}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Addresses</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-6">
                <div className="text-xl sm:text-2xl font-bold capitalize">{convexUser?.role || '—'}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">Role</p>
              </CardContent>
            </Card>
          </div>

          {/* Account Details from Clerk */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your Clerk account details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Full Name</p>
                    <p className="font-medium">{user.fullName || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">First Name</p>
                    <p className="font-medium">{user.firstName || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Last Name</p>
                    <p className="font-medium">{user.lastName || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                    <p className="font-medium">{user.primaryEmailAddress?.emailAddress || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Clerk ID</p>
                    <p className="font-mono text-xs break-all">{user.id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Convex ID</p>
                    <p className="font-mono text-xs break-all">{convexUser?._id || '—'}</p>
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>To update your profile details, visit your Clerk account settings or use the Clerk user button.</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
