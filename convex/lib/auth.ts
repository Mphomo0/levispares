import { ConvexError } from "convex/values";
import type { QueryCtx } from "../_generated/server";

/**
 * The role on the signed Clerk token: a top-level `role` claim, or one inside
 * the metadata claims. Clerk is the one place roles are set.
 */
export function roleFromClaims(identity: object): string | undefined {
  const claims = identity as Record<string, unknown>;
  const metadata = (claims.metadata ?? claims.publicMetadata) as { role?: string } | undefined;
  return (claims.role as string | undefined) ?? metadata?.role;
}

/**
 * Throws unless the caller is a signed-in, active admin.
 *
 * Admin is decided by the signed Clerk token (a `role` / public-metadata role
 * claim) or by the stored user record, which is only ever written from that
 * claim when the user signs in.
 */
export async function requireAdmin(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not authenticated");

  const claimRole = roleFromClaims(identity);

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (user?.isActive === false) throw new ConvexError("This account is deactivated");
  if (claimRole === "admin" || user?.role === "admin") return { identity, user };

  throw new ConvexError("Admin access required");
}

/** Non-throwing variant for queries, which should return nothing rather than fail. */
export async function isAdmin(ctx: QueryCtx) {
  try {
    await requireAdmin(ctx);
    return true;
  } catch {
    return false;
  }
}
