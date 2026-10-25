import type { QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { isAdmin } from "./auth";

/**
 * Whether the caller may see an order: the signed-in customer who placed it,
 * a guest holding its token, or an admin.
 */
export async function canAccessOrder(ctx: QueryCtx, order: Doc<"orders">, guestToken: string | undefined) {
  if (guestToken !== undefined) {
    return !order.userId && Boolean(order.guestToken) && order.guestToken === guestToken;
  }
  const identity = await ctx.auth.getUserIdentity();
  if (identity && order.userId) {
    const user = await ctx.db.get(order.userId);
    if (user?.clerkId === identity.subject && user.isActive !== false) return true;
  }
  return await isAdmin(ctx);
}
