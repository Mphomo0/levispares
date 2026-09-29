/** The shape of Clerk's `sessionClaims`, as far as this app's role check needs it. */
interface RoleClaims {
  metadata?: { role?: string }
  publicMetadata?: { role?: string }
}

/**
 * Reads the app's "admin" role off a Clerk session, checking both places it
 * may have been set (custom session token claim, or raw publicMetadata).
 */
export function getRole(sessionClaims: unknown): string | undefined {
  const claims = sessionClaims as RoleClaims | null | undefined
  return claims?.metadata?.role || claims?.publicMetadata?.role
}
