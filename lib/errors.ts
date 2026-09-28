import { ConvexError } from 'convex/values'

/**
 * The message to show for a failed Convex call. Convex hides ordinary error
 * messages in production, so backend errors meant for people are thrown as
 * ConvexError and read here; anything else gets the fallback.
 */
export function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof ConvexError && typeof err.data === 'string') return err.data
  return fallback
}
