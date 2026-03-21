'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { Id } from '@/convex/_generated/dataModel'
import { toast } from 'sonner'
import { useUser } from '@clerk/nextjs'

const statusStyles: Record<string, string> = {
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  shipped: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  paid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  draft: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export default function UserProfilePage() {
  const params = useParams()
  const id = params.id as Id<'users'>
  const { user: currentUser } = useUser()

  const user = useQuery(api.users.getById, { id })
  const toggleUserStatus = useMutation(api.users.toggleStatus)
  const deleteUser = useMutation(api.users.deleteById)

  // Fetch orders & addresses for this user (only when we have the clerkId)
  const userOrders = useQuery(
    api.orders.listByUser,
    user?.clerkId ? { userId: user.clerkId as Id<'users'> } : 'skip'
  )
  const userAddresses = useQuery(
    api.addresses.listByUser,
    user?.clerkId ? { userId: user.clerkId as Id<'users'> } : 'skip'
  )

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading profile...</div>
      </div>
    )
  }

  if (user === null) {
    return (
      <Card className="max-w-md mx-auto mt-10">
        <CardHeader>
          <CardTitle>User Not Found</CardTitle>
          <CardDescription>The user you are looking for does not exist or has been removed.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/admin/users">Back to Users</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const isSelf = currentUser?.id === user.clerkId
  const isActive = user.isActive !== false

  const handleToggleStatus = async () => {
    if (isSelf) {
      toast.error("You cannot deactivate your own account.")
      return
    }
    try {
      await toggleUserStatus({ id: user._id })
      toast.success(`User ${isActive ? 'deactivated' : 'activated'} successfully`)
    } catch (error: any) {
      toast.error(error.message || "Failed to update user status")
    }
  }

  const handleDeleteUser = async () => {
    if (isSelf) {
      toast.error("You cannot delete your own account.")
      return
    }
    if (!window.confirm('Permanently remove this user record from Convex?')) return
    try {
      await deleteUser({ id: user._id })
      toast.success("User record deleted")
      window.location.href = '/admin/users'
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user")
    }
  }

  const totalSpent = userOrders?.reduce((sum, o) => {
    if (o.status !== 'cancelled') return sum + o.total
    return sum
  }, 0) ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/users">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Profile</h2>
          <p className="text-muted-foreground">Detailed overview of {user.name || user.email}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* User Identity Card */}
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-col items-center text-center">
            <div className="h-24 w-24 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4">
              <span className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </span>
            </div>
            <CardTitle>{user.name || 'Anonymous User'}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
            <div className="flex gap-2 mt-4">
              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="uppercase">
                {user.role}
              </Badge>
              <Badge variant={isActive ? 'outline' : 'destructive'} className="uppercase">
                {isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-2 text-sm gap-y-2">
              <span className="text-muted-foreground">Clerk ID:</span>
              <span className="font-mono text-[10px] break-all">{user.clerkId}</span>
              <span className="text-muted-foreground">Joined:</span>
              <span>{new Date(user._creationTime).toLocaleDateString('en-ZA')}</span>
              <span className="text-muted-foreground">Total Spent:</span>
              <span className="font-medium">R{totalSpent.toFixed(2)}</span>
              <span className="text-muted-foreground">Orders:</span>
              <span className="font-medium">{userOrders?.length ?? '...'}</span>
              <span className="text-muted-foreground">Addresses:</span>
              <span className="font-medium">{userAddresses?.length ?? '...'}</span>
            </div>
            
            <div className="pt-4 flex flex-col gap-2">
              <Button 
                variant={isActive ? "destructive" : "default"} 
                className="w-full"
                disabled={isSelf}
                onClick={handleToggleStatus}
              >
                {isActive ? 'Deactivate Account' : 'Activate Account'}
              </Button>
              {!isSelf && (
                <Button variant="outline" className="w-full text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800" onClick={handleDeleteUser}>
                  Delete User Record
                </Button>
              )}
              {isSelf && (
                <p className="text-[10px] text-center text-muted-foreground">
                  You cannot modify your own administrative account.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Orders & Addresses */}
        <div className="md:col-span-2 space-y-6">
          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Orders</CardTitle>
              <CardDescription>Order history for this user</CardDescription>
            </CardHeader>
            <CardContent>
              {userOrders === undefined ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : userOrders.length === 0 ? (
                <div className="rounded-md border p-8 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="p-3 bg-muted rounded-full">
                    <svg className="h-6 w-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <p className="font-medium text-sm">No orders found</p>
                  <p className="text-xs text-muted-foreground">This user hasn&apos;t placed any orders yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userOrders.map((order) => (
                      <TableRow key={order._id}>
                        <TableCell className="font-mono text-xs">{order._id.slice(-8).toUpperCase()}</TableCell>
                        <TableCell>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</TableCell>
                        <TableCell className="font-medium">R{order.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[order.status] || 'bg-muted text-muted-foreground'}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(order._creationTime).toLocaleDateString('en-ZA')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Addresses */}
          <Card>
            <CardHeader>
              <CardTitle>Addresses</CardTitle>
              <CardDescription>Saved addresses for this user</CardDescription>
            </CardHeader>
            <CardContent>
              {userAddresses === undefined ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : userAddresses.length === 0 ? (
                <div className="rounded-md border p-6 flex flex-col items-center justify-center text-center space-y-2">
                  <p className="font-medium text-sm">No addresses saved</p>
                  <p className="text-xs text-muted-foreground">This user hasn&apos;t added any addresses yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userAddresses.map((addr) => (
                    <div key={addr._id} className="p-3 rounded-lg border flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{addr.label}</p>
                          {addr.isDefault && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">Default</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{addr.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {addr.street}, {addr.city}, {addr.province} {addr.postalCode}
                        </p>
                        <p className="text-xs text-muted-foreground">{addr.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
