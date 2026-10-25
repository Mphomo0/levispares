'use server'

import { auth, clerkClient, currentUser } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
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

/**
 * Moves orders the customer placed as a guest into their account. Only email
 * addresses Clerk has verified as theirs are used, so nobody can claim
 * someone else's orders by typing their email.
 */
export async function linkGuestOrders() {
  const user = await currentUser()
  if (!user) return { linked: 0 }

  const verifiedEmails = user.emailAddresses
    .filter((address) => address.verification?.status === 'verified')
    .map((address) => address.emailAddress)
  if (verifiedEmails.length === 0) return { linked: 0 }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
  return await convex.mutation(api.orders.linkGuestOrders, {
    clerkId: user.id,
    verifiedEmails,
    serverSecret: process.env.PAYMENT_SERVER_SECRET!,
  })
}
