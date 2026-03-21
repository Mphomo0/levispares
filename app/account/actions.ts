'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'

export async function deleteAccount() {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  const client = await clerkClient()
  await client.users.deleteUser(userId)

  return { success: true }
}
