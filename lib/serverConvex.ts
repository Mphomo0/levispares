import { auth } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'

/** A Convex client that acts as the signed-in customer, or null when nobody is signed in. */
export async function getConvexAsUser() {
  const { userId, getToken } = await auth()
  if (!userId) return null

  const token = await getToken({ template: 'convex' })
  if (!token) return null

  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
  client.setAuth(token)
  return client
}
