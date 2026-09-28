import { ConvexError } from "convex/values";
import type { QueryCtx } from "../_generated/server";

/**
 * Throws unless the caller is a signed-in, active admin.
 *
 * Admin is decided by the signed Clerk token (a `role` / public-metadata role
 * claim) or by the stored user record, which is only ever written from that
 * claim or by an admin-gated mutation.
 */
export async function requireAdmin(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not authenticated");

  const claims = identity as Record<string, unknown>;
  const metadata = (claims.metadata ?? claims.publicMetadata) as
    | { role?: string }
    | undefined;
  const claimRole = (claims.role as string | undefined) ?? metadata?.role;

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
