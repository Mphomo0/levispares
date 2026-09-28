'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { api } from '@/convex/_generated/api'
import { getConvexAsUser } from '@/lib/serverConvex'

export async function deleteAccount() {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  // Erase the customer's personal data first, then their login.
  const convex = await getConvexAsUser()
  if (!convex) {
    throw new Error('Unauthorized')
  }
  await convex.mutation(api.users.deleteMyData, {})

  const client = await clerkClient()
  await client.users.deleteUser(userId)

  return { success: true }
}
